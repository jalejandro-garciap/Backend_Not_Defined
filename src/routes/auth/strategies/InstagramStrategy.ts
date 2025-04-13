import { AuthService } from '../services/auth.service';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-instagram';
import { InternalOAuthError } from 'passport-oauth2';

@Injectable()
export class InstagramStrategy extends PassportStrategy(Strategy, 'instagram') {
  private _oauth2: any;
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      callbackURL: process.env.INSTAGRAM_CALLBACK_URL,
      scope: [
        'instagram_business_basic',
        'instagram_business_manage_messages',
        'instagram_business_content_publish',
        'instagram_business_manage_comments',
      ],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    refreshToken = refreshToken || 'no-refresh-token';
    try {
      const user = await this.authService.validateSocialMedia({
          id: profile.id,
          social_media_name: 'instagram',
          username: profile.username,
          img: profile.profileImage,
          email: null,
          accessToken,
          refreshToken,
        },
      );
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }

  userProfile(accessToken: string, done: Function) {
    this._oauth2.get(
      'https://graph.instagram.com/me?fields=id,username,account_type,media_count,profile_picture_url',
      accessToken,
      (err, body, res) => {
        if (err) {
          return done(
            new InternalOAuthError('failed to fetch user profile', err),
          );
        }

        try {
          const json = JSON.parse(body);
          console.log(json);
          const profile = {
            provider: 'instagram',
            id: json.id,
            username: json.username,
            displayName: json.username,
            profileImage: json.profile_picture_url || 'missing',
            _raw: body,
            _json: json,
          };
          done(null, profile);
        } catch (e) {
          done(e);
        }
      },
    );
  }
}
