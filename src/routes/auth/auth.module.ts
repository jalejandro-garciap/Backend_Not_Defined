import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { SessionSerializer } from './utils/SessionSerializer';
import { UserService } from '../user/services/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { TikTokStrategy } from './strategies/TikTokStrategy';
import { InstagramStrategy } from './strategies/InstagramStrategy';
import { PassportModule } from '@nestjs/passport';
import { YoutubeStrategy } from './strategies/YoutubeStrategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'instagram' })],
  controllers: [AuthController],
  providers: [
    TikTokStrategy,
    InstagramStrategy,
    YoutubeStrategy,
    SessionSerializer,
    AuthService,
    UserService,
    PrismaService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
