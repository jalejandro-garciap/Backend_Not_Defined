import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import { SocialMedia } from '@prisma/client';

@Injectable()
export class TokenValidationService {
  constructor(@Inject() private readonly prisma: PrismaService) {}

  calculateTokenExpiration(expiresInSeconds: number): Date {
    const now = new Date();
    return new Date(now.getTime() + expiresInSeconds * 1000);
  }

  isTokenExpiring(expiresAt: Date): boolean {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    return expiresAt <= thirtyMinutesFromNow;
  }

  async getTokenExpirationFromPlatform(
    platform: string,
    accessToken: string,
  ): Promise<Date | null> {
    try {
      switch (platform.toLowerCase()) {
        case 'google':
        case 'youtube':
          return await this.getGoogleTokenExpiration(accessToken);
        
        case 'instagram':
          return await this.getInstagramTokenExpiration(accessToken);
        
        case 'tiktok':
          return await this.getTikTokTokenExpiration(accessToken);
        
        default:
          console.warn(`Token expiration check not implemented for platform: ${platform}`);
          return null;
      }
    } catch (error) {
      console.error(`Error checking token expiration for ${platform}:`, error.message);
      return null;
    }
  }

  private async getGoogleTokenExpiration(accessToken: string): Promise<Date | null> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
      );
      
      if (response.data.expires_in) {
        return this.calculateTokenExpiration(response.data.expires_in);
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 400) {
        return new Date(0); 
      }
      throw error;
    }
  }

  private async getInstagramTokenExpiration(accessToken: string): Promise<Date | null> {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/me?fields=id&access_token=${accessToken}`
      );
      
      if (response.status === 200) {
        return this.calculateTokenExpiration(60 * 24 * 60 * 60); // 60 days in seconds
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        return new Date(0);
      }
      throw error;
    }
  }
  private async getTikTokTokenExpiration(accessToken: string): Promise<Date | null> {
    try {
      const response = await axios.post(
        'https://open.tiktokapis.com/v2/user/info/',
        {
          access_token: accessToken,
          fields: ['open_id']
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.status === 200) {
        return this.calculateTokenExpiration(24 * 60 * 60); // 24 hours in seconds
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 401) {
        return new Date(0);
      }
      throw error;
    }
  }

  async updateTokenExpiration(
    socialMediaId: string,
    expirationDate: Date,
  ): Promise<void> {
    await this.prisma.socialMedia.update({
      where: { id: socialMediaId },
      data: {
        token_expires_at: expirationDate,
        updated_at: new Date(),
      },
    });
  }

  async getExpiredTokens(): Promise<SocialMedia[]> {
    const now = new Date();
    return this.prisma.socialMedia.findMany({
      where: {
        token_expires_at: {
          lte: now,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async validateAndUpdateTokenExpiration(socialMediaId: string): Promise<{
    valid: boolean;
    message: string;
    expiresAt?: Date;
  }> {
    const socialMedia = await this.prisma.socialMedia.findUnique({
      where: { id: socialMediaId },
    });

    if (!socialMedia) {
      return {
        valid: false,
        message: 'Social media account not found',
      };
    }

    const isExpiring = socialMedia.token_expires_at
      ? this.isTokenExpiring(socialMedia.token_expires_at)
      : true;

    if (isExpiring) {
      if (socialMedia.social_media_name === 'youtube' && socialMedia.refresh_token) {
        try {
          const refreshResult = await this.refreshYouTubeToken(socialMedia);
          return refreshResult;
        } catch (error) {
          console.error('Error refreshing YouTube token:', error);
          return {
            valid: false,
            message: 'Failed to refresh YouTube token',
          };
        }
      }

      return {
        valid: false,
        message: 'Token is expired or expiring soon',
        expiresAt: socialMedia.token_expires_at,
      };
    }

    return {
      valid: true,
      message: 'Token is valid',
      expiresAt: socialMedia.token_expires_at,
    };
  }

  private async refreshYouTubeToken(socialMedia: SocialMedia): Promise<{
    valid: boolean;
    message: string;
    expiresAt?: Date;
  }> {
    const refreshTokenPayload = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: socialMedia.refresh_token,
      grant_type: 'refresh_token',
    });

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: refreshTokenPayload,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('YouTube token refresh failed:', errorData);
        return {
          valid: false,
          message: 'Failed to refresh YouTube token: ' + response.statusText,
        };
      }

      const tokenData = await response.json();
      
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      await this.prisma.socialMedia.update({
        where: { id: socialMedia.id },
        data: {
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt,
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
        },
      });

      return {
        valid: true,
        message: 'YouTube token refreshed successfully',
        expiresAt: newExpiresAt,
      };

    } catch (error) {
      console.error('Error during YouTube token refresh:', error);
      return {
        valid: false,
        message: 'Network error during token refresh',
      };
    }
  }

  async checkTokensForUser(userId: string): Promise<{
    [platform: string]: {
      connected: boolean;
      tokenExpired: boolean;
      expiresAt?: Date;
    };
  }> {
    const socialMediaAccounts = await this.prisma.socialMedia.findMany({
      where: { user_id: userId },
    });

    const result: {
      [platform: string]: {
        connected: boolean;
        tokenExpired: boolean;
        expiresAt?: Date;
      };
    } = {};

    for (const account of socialMediaAccounts) {
      const isExpiring = account.token_expires_at
        ? this.isTokenExpiring(account.token_expires_at)
        : true;

      result[account.social_media_name] = {
        connected: true,
        tokenExpired: isExpiring,
        expiresAt: account.token_expires_at,
      };
    }

    return result;
  }
} 