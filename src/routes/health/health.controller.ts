import { Controller, Get } from '@nestjs/common';
import { TokenSchedulerService } from '../../shared/services/token-scheduler.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly tokenSchedulerService: TokenSchedulerService,
  ) {}

  @Get()
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      scheduler: {
        enabled: true,
        nextRun: 'Every 30 minutes',
        lastCheck: new Date().toISOString(),
      },
    };
  }

  @Get('scheduler')
  async getSchedulerStatus() {
    try {
      const schedulerInfo = this.tokenSchedulerService.getSchedulerInfo();
      
      return {
        status: 'active',
        message: 'Token scheduler is running',
        timestamp: new Date().toISOString(),
        scheduler: schedulerInfo,
        config: {
          tokenRefreshInterval: '30 minutes',
          cleanupInterval: 'Daily at 2:00 AM',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Token scheduler has issues',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('crypto')
  async getCryptoStatus() {
    try {
      const testUUID = globalThis.crypto.randomUUID();
      return {
        status: 'ok',
        message: 'crypto.randomUUID is working',
        testUUID,
        cryptoAvailable: !!globalThis.crypto,
        randomUUIDAvailable: !!globalThis.crypto?.randomUUID,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'crypto.randomUUID has issues',
        error: error.message,
        cryptoAvailable: !!globalThis.crypto,
        timestamp: new Date().toISOString(),
      };
    }
  }
} 