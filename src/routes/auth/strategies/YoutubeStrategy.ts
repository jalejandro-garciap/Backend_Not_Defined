import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy as YoutubeV3Strategy,
  VerifyCallback,
} from 'passport-youtube-v3';
import { AuthService } from '../services/auth.service';

@Injectable()
export class YoutubeStrategy extends PassportStrategy(YoutubeV3Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      callbackURL: process.env.YOUTUBE_CALLBACK_URL,
      passReqToCallback: true,
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
        'https://www.googleapis.com/auth/youtubepartner',
      ],
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const photo =
        profile.photos && profile.photos[0]
          ? profile.photos[0].value
          : 'no-photo';
      const email =
        profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      const tokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

      await this.authService.validateSocialMedia(
        {
          id: profile.id,
          social_media_name: 'youtube',
          username: profile.displayName,
          img: photo,
          email,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        },
        req,
      );

      if (!req.session.socialConnections) {
        req.session.socialConnections = {};
      }

      req.session.socialConnections['youtube'] = {
        id: profile.id,
        username: profile.displayName,
      };

      done(null, {
        provider: 'youtube',
        id: profile.id,
        socialConnection: true,
      });
    } catch (err) {
      console.error('❌ Error en validación de Youtube Strategy:', err);
      done(err, false);
    }
  }
}
