import { Injectable, Inject } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserService } from 'src/routes/user/services/user.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(@Inject() private readonly userService: UserService) {}

  async validateUser(profile: any): Promise<any> {
    const user = await this.userService.getUserByMail(profile.email);
    if (!user) {
      return this.userService.createUser({
        id: profile.id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        username: profile.username,
        img: profile.img,
        email: profile.email,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      });
    }
    return user;
  }

  async validateSocialMedia(profile: any, req: Request): Promise<any> {
    const social_media = await this.userService.getSocialMediaById(profile.id);

    if (!social_media) {
      const sessionCookie = req.cookies['connect.sid'];
      const sessionId = sessionCookie.split('.')[0].slice(2);

      return this.userService.addSocialMediaToUser(
        {
          id: profile.id,
          social_media_name: profile.social_media_name,
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          username: profile.username,
          img: profile.img,
          email: profile.email,
          tokenExpiresAt: profile.tokenExpiresAt,
        },
        sessionId,
      );
    } else {
      return this.userService.updateSocialMediaTokens(
        social_media.id,
        profile.accessToken,
        profile.refreshToken,
        profile.tokenExpiresAt
      );
    }

    return social_media;
  }
}
