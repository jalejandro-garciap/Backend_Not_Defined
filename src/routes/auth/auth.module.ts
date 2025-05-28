import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenValidationService } from './services/token-validation.service';
import { SessionSerializer } from './utils/SessionSerializer';
import { PrismaService } from '../../prisma/prisma.service';
import { TikTokStrategyAuth } from './strategies/TikTokStrategy';
import { InstagramStrategy } from './strategies/InstagramStrategy';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { UserModule } from '../user/user.module';
import { YoutubeStrategy } from './strategies/YoutubeStrategy';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    TikTokStrategyAuth,
    InstagramStrategy,
    GoogleStrategy,
    YoutubeStrategy,
    SessionSerializer,
    AuthService,
    TokenValidationService,
    PrismaService,
  ],
})
export class AuthModule {}
