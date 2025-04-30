import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { SessionSerializer } from './utils/SessionSerializer';
import { UserService } from '../user/services/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TikTokStrategy } from './strategies/TikTokStrategy';
import { InstagramStrategy } from './strategies/InstagramStrategy';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { UserModule } from '../user/user.module';
import { YoutubeStrategy } from './strategies/YoutubeStrategy';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    TikTokStrategy,
    InstagramStrategy,
    GoogleStrategy,
    YoutubeStrategy,
    SessionSerializer,
    AuthService,
    PrismaService,
  ],
})
export class AuthModule {}
