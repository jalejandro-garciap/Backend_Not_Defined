import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TokenValidationService {
  constructor(@Inject() private readonly prisma: PrismaService) {}

  calculateTokenExpiration(expiresInSeconds: number): Date {
    const now = new Date();
    return new Date(now.getTime() + expiresInSeconds * 1000);
  }

  isTokenExpiring(expirationDate: Date): boolean {
    if (!expirationDate) return true;
    
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer
    
    return expirationDate <= fiveMinutesFromNow;
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

  async getExpiredTokens(): Promise<any[]> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return await this.prisma.socialMedia.findMany({
      where: {
        OR: [
          { token_expires_at: null },
          { token_expires_at: { lte: fiveMinutesFromNow } },
        ],
        enabled: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }
  async validateAndUpdateTokenExpiration(socialMediaId: string): Promise<{
    isValid: boolean;
    expirationDate?: Date;
    needsRefresh: boolean;
  }> {
    const socialMedia = await this.prisma.socialMedia.findUnique({
      where: { id: socialMediaId },
    });

    if (!socialMedia) {
      throw new Error('Social media account not found');
    }

    if (socialMedia.token_expires_at && !this.isTokenExpiring(socialMedia.token_expires_at)) {
      return {
        isValid: true,
        expirationDate: socialMedia.token_expires_at,
        needsRefresh: false,
      };
    }

    const expirationDate = await this.getTokenExpirationFromPlatform(
      socialMedia.social_media_name,
      socialMedia.access_token,
    );

    if (!expirationDate || this.isTokenExpiring(expirationDate)) {
      return {
        isValid: false,
        expirationDate,
        needsRefresh: true,
      };
    }

    await this.updateTokenExpiration(socialMediaId, expirationDate);

    return {
      isValid: true,
      expirationDate,
      needsRefresh: false,
    };
  }
} 