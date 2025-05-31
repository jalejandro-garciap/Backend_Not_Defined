import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { SessionSerializer } from './utils/SessionSerializer';
import { TokenRefreshInterceptor } from './utils/token-refresh.interceptor';
import { TokenRefreshScheduler } from './utils/token-refresh.scheduler';
import { UserService } from '../user/services/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TikTokStrategy } from './strategies/TikTokStrategy';
import { InstagramStrategy } from './strategies/InstagramStrategy';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { UserModule } from '../user/user.module';
import { YoutubeStrategy } from './strategies/YoutubeStrategy';

@Module({
  imports: [
    UserModule,
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    TikTokStrategy,
    InstagramStrategy,
    GoogleStrategy,
    YoutubeStrategy,
    SessionSerializer,
    AuthService,
    TokenRefreshService,
    TokenRefreshInterceptor,
    TokenRefreshScheduler,
    PrismaService,
  ],
  exports: [TokenRefreshService, TokenRefreshInterceptor],
})
export class AuthModule {}
