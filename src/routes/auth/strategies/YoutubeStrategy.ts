import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as YoutubeV3Strategy, VerifyCallback } from 'passport-youtube-v3';
import { AuthService } from '../services/auth.service';

@Injectable()
export class YoutubeStrategy extends PassportStrategy(YoutubeV3Strategy, 'youtube') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      callbackURL: process.env.YOUTUBE_CALLBACK_URL,
      scope: ['https://www.googleapis.com/auth/youtube.readonly'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    try {

      const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : "no-photo";
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      const user = await this.authService.validateUser({
        id: profile.id,
        social_media_name: 'youtube',
        username: profile.displayName,
        img: photo,
        email: email,
        accessToken,
        refreshToken,
      });
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}