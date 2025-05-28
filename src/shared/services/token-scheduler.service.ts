import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenValidationService } from '../../routes/auth/services/token-validation.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenSchedulerService {
  private readonly logger = new Logger(TokenSchedulerService.name);

  constructor(
    private readonly tokenValidationService: TokenValidationService,
    private readonly prisma: PrismaService,
  ) {}

  // Ejecutar cada 30 minutos
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshExpiringTokens() {
    this.logger.log('🔄 Iniciando proceso de renovación automática de tokens...');
    
    try {
      // Buscar tokens que expiran en los próximos 45 minutos
      const expiringTokens = await this.getExpiringTokens();
      
      if (expiringTokens.length === 0) {
        this.logger.log('✅ No hay tokens próximos a expirar');
        return;
      }

      this.logger.log(`🔍 Encontrados ${expiringTokens.length} tokens próximos a expirar`);

      let refreshedCount = 0;
      let failedCount = 0;

      // Procesar cada token
      for (const socialMedia of expiringTokens) {
        try {
          const result = await this.refreshTokenForPlatform(socialMedia);
          
          if (result.success) {
            refreshedCount++;
            this.logger.log(
              `✅ Token renovado exitosamente: ${socialMedia.social_media_name} - ${socialMedia.username}`
            );
          } else {
            failedCount++;
            this.logger.warn(
              `⚠️ Falló renovación de token: ${socialMedia.social_media_name} - ${socialMedia.username} - ${result.error}`
            );
          }
        } catch (error) {
          failedCount++;
          this.logger.error(
            `❌ Error procesando token: ${socialMedia.social_media_name} - ${socialMedia.username}`,
            error.stack
          );
        }
      }

      this.logger.log(
        `🎯 Proceso completado: ${refreshedCount} exitosos, ${failedCount} fallidos`
      );

    } catch (error) {
      this.logger.error('❌ Error en proceso de renovación automática', error.stack);
    }
  }

  // Ejecutar cada día a las 2:00 AM para limpiar tokens completamente expirados
  @Cron('0 2 * * *')
  async cleanupExpiredTokens() {
    this.logger.log('🧹 Iniciando limpieza de tokens expirados...');
    
    try {
      // Buscar tokens expirados hace más de 7 días
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const expiredTokens = await this.prisma.socialMedia.findMany({
        where: {
          token_expires_at: {
            lt: sevenDaysAgo,
          },
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

      if (expiredTokens.length === 0) {
        this.logger.log('✅ No hay tokens expirados para limpiar');
        return;
      }

      this.logger.log(`🔍 Encontrados ${expiredTokens.length} tokens expirados para limpiar`);

      // Marcar como desconectados (en lugar de eliminar)
      const updateResult = await this.prisma.socialMedia.updateMany({
        where: {
          id: {
            in: expiredTokens.map(token => token.id),
          },
        },
        data: {
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
        },
      });

      this.logger.log(`🧹 Limpieza completada: ${updateResult.count} tokens procesados`);

    } catch (error) {
      this.logger.error('❌ Error en limpieza de tokens expirados', error.stack);
    }
  }

  // Método auxiliar para obtener tokens próximos a expirar
  private async getExpiringTokens() {
    const next45Minutes = new Date(Date.now() + 45 * 60 * 1000);
    
    return this.prisma.socialMedia.findMany({
      where: {
        AND: [
          {
            token_expires_at: {
              lte: next45Minutes,
            },
          },
          {
            token_expires_at: {
              gt: new Date(), // Aún no ha expirado completamente
            },
          },
          {
            access_token: {
              not: null,
            },
          },
          {
            refresh_token: {
              not: null,
            },
          },
        ],
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

  // Método para refrescar token según la plataforma
  private async refreshTokenForPlatform(socialMedia: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      switch (socialMedia.social_media_name.toLowerCase()) {
        case 'youtube':
        case 'google':
          return await this.refreshGoogleToken(socialMedia);
        
        case 'instagram':
          return await this.refreshInstagramToken(socialMedia);
        
        case 'tiktok':
          return await this.refreshTikTokToken(socialMedia);
        
        default:
          return {
            success: false,
            error: `Plataforma no soportada: ${socialMedia.social_media_name}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Refrescar token de Google/YouTube
  private async refreshGoogleToken(socialMedia: any): Promise<{
    success: boolean;
    error?: string;
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
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`,
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
          updated_at: new Date(),
        },
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error.message}`,
      };
    }
  }

  // Refrescar token de Instagram (long-lived tokens)
  private async refreshInstagramToken(socialMedia: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Para Instagram, intentamos extender el token de larga duración
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${socialMedia.access_token}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const tokenData = await response.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 5184000) * 1000); // 60 días por defecto

      await this.prisma.socialMedia.update({
        where: { id: socialMedia.id },
        data: {
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date(),
        },
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Instagram refresh error: ${error.message}`,
      };
    }
  }

  // Refrescar token de TikTok usando refresh token oficial
  private async refreshTikTokToken(socialMedia: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    const refreshTokenPayload = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_ID,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      refresh_token: socialMedia.refresh_token,
      grant_type: 'refresh_token',
    });

    try {
      const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: refreshTokenPayload,
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`,
        };
      }

      const tokenData = await response.json();
      
      // TikTok access tokens duran 24 horas (86400 segundos)
      // Refresh tokens duran 365 días (31536000 segundos)
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000);

      await this.prisma.socialMedia.update({
        where: { id: socialMedia.id },
        data: {
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt,
          // TikTok puede devolver un nuevo refresh token
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
          updated_at: new Date(),
        },
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `TikTok refresh error: ${error.message}`,
      };
    }
  }

  // Método manual para forzar renovación de un usuario específico
  async forceRefreshUserTokens(userId: string): Promise<{
    refreshed: number;
    failed: number;
    details: Array<{ platform: string; success: boolean; error?: string }>;
  }> {
    this.logger.log(`🔄 Forzando renovación de tokens para usuario: ${userId}`);

    const userTokens = await this.prisma.socialMedia.findMany({
      where: {
        user_id: userId,
        access_token: { not: null },
        refresh_token: { not: null },
      },
    });

    const results = {
      refreshed: 0,
      failed: 0,
      details: [] as Array<{ platform: string; success: boolean; error?: string }>,
    };

    for (const socialMedia of userTokens) {
      const result = await this.refreshTokenForPlatform(socialMedia);
      
      results.details.push({
        platform: socialMedia.social_media_name,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        results.refreshed++;
      } else {
        results.failed++;
      }
    }

    return results;
  }
} 