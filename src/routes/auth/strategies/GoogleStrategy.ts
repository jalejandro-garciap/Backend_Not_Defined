import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../services/auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    });
  }
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const user = await this.authService.validateUser({
        id: profile.id,
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        username: profile.displayName,
        email: profile.emails[0].value,
        img: profile.photos[0].value,
        accessToken,
        refreshToken,
      });
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
