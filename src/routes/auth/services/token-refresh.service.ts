import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { UserService } from '../../user/services/user.service';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {}

  async refreshInstagramToken(
    socialMediaId: string,
    currentAccessToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date } | null> {
    try {
      this.logger.log(
        `Renovando token de Instagram para social media ID: ${socialMediaId}`,
      );

      const url = 'https://graph.instagram.com/refresh_access_token';
      const params = {
        grant_type: 'ig_refresh_token',
        access_token: currentAccessToken,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, { params }).pipe(
          catchError((error) => {
            this.logger.error(
              'Error renovando token de Instagram:',
              error.response?.data || error.message,
            );
            throw error;
          }),
        ),
      );

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      await this.userService.updateSocialMediaTokens(
        socialMediaId,
        access_token,
        null,
        expiresAt,
      );

      this.logger.log(
        `Token de Instagram renovado exitosamente. Expira: ${expiresAt}`,
      );
      return { accessToken: access_token, expiresAt };
    } catch (error) {
      this.logger.error(`Error renovando token de Instagram:`, error);
      return null;
    }
  }

  async refreshYouTubeToken(
    socialMediaId: string,
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  } | null> {
    try {
      this.logger.log(
        `Renovando token de YouTube para social media ID: ${socialMediaId}`,
      );

      const url = 'https://oauth2.googleapis.com/token';
      const data = {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      };

      const response = await firstValueFrom(
        this.httpService.post(url, data).pipe(
          catchError((error) => {
            this.logger.error('Error renovando token de YouTube:');
            this.logger.error('Object:');
            this.logger.error(
              JSON.stringify(error.response?.data || error.message, null, 2),
            );

            if (error.response?.data?.error === 'unauthorized_client') {
              this.logger.error(
                'El refresh token de YouTube ha expirado o es inválido. El usuario debe reconectar su cuenta.',
              );
              this.markSocialMediaAsExpired(socialMediaId);
            } else if (error.response?.data?.error === 'invalid_client') {
              this.logger.error(
                'Las credenciales de OAuth de Google son inválidas. Verifica GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.',
              );
            } else if (error.response?.data?.error === 'invalid_grant') {
              this.logger.error(
                'El refresh token de YouTube es inválido o ha sido revocado.',
              );
              this.markSocialMediaAsExpired(socialMediaId);
            }

            throw error;
          }),
        ),
      );

      const { access_token, expires_in, refresh_token } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      await this.userService.updateSocialMediaTokens(
        socialMediaId,
        access_token,
        refresh_token || refreshToken,
        expiresAt,
      );

      this.logger.log(
        `Token de YouTube renovado exitosamente. Expira: ${expiresAt}`,
      );
      return {
        accessToken: access_token,
        expiresAt,
        refreshToken: refresh_token || refreshToken,
      };
    } catch (error) {
      this.logger.error(`Error renovando token de YouTube:`, error);
      this.logger.error(JSON.stringify(error, null, 2));
      return null;
    }
  }

  async refreshTikTokToken(
    socialMediaId: string,
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken: string;
  } | null> {
    try {
      this.logger.log(
        `Renovando token de TikTok para social media ID: ${socialMediaId}`,
      );

      const url = 'https://open.tiktokapis.com/v2/oauth/token/';
      const data = {
        client_key: process.env.TIKTOK_CLIENT_ID,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      };

      const response = await firstValueFrom(
        this.httpService
          .post(url, data, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(
            catchError((error) => {
              this.logger.error(
                'Error renovando token de TikTok:',
                error.response?.data || error.message,
              );
              throw error;
            }),
          ),
      );

      const { access_token, expires_in, refresh_token } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      await this.userService.updateSocialMediaTokens(
        socialMediaId,
        access_token,
        refresh_token,
        expiresAt,
      );

      this.logger.log(
        `Token de TikTok renovado exitosamente. Expira: ${expiresAt}`,
      );
      return {
        accessToken: access_token,
        expiresAt,
        refreshToken: refresh_token,
      };
    } catch (error) {
      this.logger.error(`Error renovando token de TikTok:`, error);
      return null;
    }
  }

  async checkAndRefreshTokenIfNeeded(socialMedia: any): Promise<string | null> {
    const now = new Date();
    const expiresAt = new Date(socialMedia.token_expires_at);

    let shouldRefresh = false;

    switch (socialMedia.social_media_name.toLowerCase()) {
      case 'youtube':
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
        shouldRefresh = expiresAt <= thirtyMinutesFromNow;
        break;
      case 'instagram':
      case 'tiktok':
      default:
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        shouldRefresh = expiresAt <= oneDayFromNow;
        break;
    }

    if (shouldRefresh) {
      this.logger.log(
        `Token próximo a expirar para ${socialMedia.social_media_name}. Renovando...`,
      );

      let result = null;

      switch (socialMedia.social_media_name.toLowerCase()) {
        case 'instagram':
          result = await this.refreshInstagramToken(
            socialMedia.id,
            socialMedia.access_token,
          );
          break;
        case 'youtube':
          if (socialMedia.refresh_token) {
            result = await this.refreshYouTubeToken(
              socialMedia.id,
              socialMedia.refresh_token,
            );
          }
          break;
        case 'tiktok':
          if (socialMedia.refresh_token) {
            result = await this.refreshTikTokToken(
              socialMedia.id,
              socialMedia.refresh_token,
            );
          }
          break;
      }

      return result?.accessToken || null;
    }

    return socialMedia.access_token;
  }

  async refreshAllExpiredTokens(): Promise<void> {
    this.logger.log('Iniciando renovación masiva de tokens expirados');

    try {
      const expiredSocialMedias =
        await this.userService.getExpiringSocialMediaTokens();

      for (const socialMedia of expiredSocialMedias) {
        await this.checkAndRefreshTokenIfNeeded(socialMedia);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      this.logger.log(
        `Renovación masiva completada. Procesados ${expiredSocialMedias.length} tokens`,
      );
    } catch (error) {
      this.logger.error('Error en renovación masiva:', error);
    }
  }

  private async markSocialMediaAsExpired(socialMediaId: string): Promise<void> {
    try {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await this.userService.updateSocialMediaTokens(
        socialMediaId,
        'EXPIRED_TOKEN',
        'EXPIRED_REFRESH_TOKEN',
        pastDate,
      );
      this.logger.log(
        `Marcado social media ${socialMediaId} como expirado para forzar re-autenticación`,
      );
    } catch (error) {
      this.logger.error(`Error marcando social media como expirado:`, error);
    }
  }
}
