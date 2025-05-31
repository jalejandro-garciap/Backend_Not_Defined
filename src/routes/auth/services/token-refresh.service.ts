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

      // Instagram Basic Display API endpoint para renovar tokens
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

      // Actualizar el token en la base de datos
      await this.userService.updateSocialMediaTokens(
        socialMediaId,
        access_token,
        null, // Instagram no proporciona refresh token en la renovación
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
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      };

      const response = await firstValueFrom(
        this.httpService.post(url, data).pipe(
          catchError((error) => {
            this.logger.error(
              'Error renovando token de YouTube:',
              error.response?.data || error.message,
            );
            throw error;
          }),
        ),
      );

      const { access_token, expires_in, refresh_token } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Actualizar el token en la base de datos
      await this.userService.updateSocialMediaTokens(
        socialMediaId,
        access_token,
        refresh_token || refreshToken, // Usar el nuevo refresh token si se proporciona
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

      // Actualizar el token en la base de datos
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

    // Renovar si el token expira en las próximas 24 horas
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (expiresAt <= oneDayFromNow) {
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
      // Obtener todos los tokens que expiran en las próximas 24 horas
      const expiredSocialMedias =
        await this.userService.getExpiringSocialMediaTokens();

      for (const socialMedia of expiredSocialMedias) {
        await this.checkAndRefreshTokenIfNeeded(socialMedia);
        // Pequeña pausa entre renovaciones para evitar rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      this.logger.log(
        `Renovación masiva completada. Procesados ${expiredSocialMedias.length} tokens`,
      );
    } catch (error) {
      this.logger.error('Error en renovación masiva:', error);
    }
  }
}
