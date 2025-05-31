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
      passReqToCallback: true,
      scope: [
        'user.info.basic',
        'user.info.profile',
        'user.info.stats',
        'video.list',
      ],
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: TiktokProfile,
  ) {
    try {
      let accessTokenExpiresAt: Date | null = null;

      const expiresIn =
        req.authInfo?.expires_in ||
        req.query?.expires_in ||
        req.body?.expires_in ||
        86400;

      if (expiresIn) {
        accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      }

      await this.authService.validateSocialMedia(
        {
          id: profile.id,
          social_media_name: 'tiktok',
          username: profile.username,
          img: profile.profileImage,
          email: null,
          accessToken,
          refreshToken,
          accessTokenExpiresAt,
        },
        req,
      );

      if (!req.session.socialConnections) {
        req.session.socialConnections = {};
      }

      req.session.socialConnections['tiktok'] = {
        id: profile.id,
        username: profile.username,
      };

      return { provider: 'tiktok', id: profile.id, socialConnection: true };
    } catch (err) {
      console.error('❌ Error en validación de TikTok Strategy:', err);
      throw err;
    }
  }
}
