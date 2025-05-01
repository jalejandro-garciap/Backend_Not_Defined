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
      scope: ['https://www.googleapis.com/auth/youtube.readonly'],
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

      const user = await this.authService.validateSocialMedia(
        {
          id: profile.id,
          social_media_name: 'youtube',
          username: profile.displayName,
          img: photo,
          email,
          accessToken,
          refreshToken,
        },
        req,
      );
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
