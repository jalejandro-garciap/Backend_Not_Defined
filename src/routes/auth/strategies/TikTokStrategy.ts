import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { Strategy } from 'passport-tiktok-auth';
import { TiktokProfile } from './profiles/TiktokProfile';

@Injectable()
export class TikTokStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject() private readonly authService: AuthService) {
    super({
      clientID: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      callbackURL: process.env.TIKTOK_CALLBACK_URL,
      scope: ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.list'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: TiktokProfile,
  ) {
    return this.authService.validateUser({
      id: profile.id,
      social_media_name: 'tiktok',
      username: profile.username,
      img: profile.profileImage,
      email: null,
      accessToken,
      refreshToken,
    });
  }
}
