import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-tiktok-auth';
import { AuthService } from '../services/auth.service';

@Injectable()
export class TikTokStrategyAuth extends PassportStrategy(Strategy, 'tiktok') {
  constructor(private readonly authService: AuthService) {
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
    profile: any,
    done: Function,
  ) {
    try {
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      await this.authService.validateSocialMedia(
        {
          id: profile.id,
          social_media_name: 'tiktok',
          username: profile.username || profile.displayName,
          img: profile.photos?.[0]?.value || 'no-photo',
          email: profile.emails?.[0]?.value || null,
          accessToken,
          refreshToken: refreshToken || 'no-refresh-token',
          tokenExpiresAt, // Add expiration date
        },
        req,
      );

      if (!req.session.socialConnections) {
        req.session.socialConnections = {};
      }

      req.session.socialConnections['tiktok'] = {
        id: profile.id,
        username: profile.username || profile.displayName,
      };

      done(null, {
        provider: 'tiktok',
        id: profile.id,
        socialConnection: true,
      });
    } catch (err) {
      console.error('❌ Error en validación de TikTok Strategy:', err);
      done(err, false);
    }
  }
}
