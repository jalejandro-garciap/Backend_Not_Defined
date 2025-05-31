import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenRefreshService } from '../services/token-refresh.service';

@Injectable()
export class TokenRefreshScheduler {
  private readonly logger = new Logger(TokenRefreshScheduler.name);

  constructor(private readonly tokenRefreshService: TokenRefreshService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleTokenRefresh() {
    this.logger.log('Iniciando renovación automática de tokens');
    try {
      await this.tokenRefreshService.refreshAllExpiredTokens();
      this.logger.log('Renovación automática de tokens completada');
    } catch (error) {
      this.logger.error('Error en renovación automática de tokens:', error);
    }
  }

  // Ejecutar a las 2:00 AM todos los días
  @Cron('0 2 * * *')
  async handleDailyTokenRefresh() {
    this.logger.log('Iniciando renovación diaria de tokens');
    try {
      await this.tokenRefreshService.refreshAllExpiredTokens();
      this.logger.log('Renovación diaria de tokens completada');
    } catch (error) {
      this.logger.error('Error en renovación diaria de tokens:', error);
    }
  }
}