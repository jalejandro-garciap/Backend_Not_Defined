import { Injectable, Inject } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserService } from 'src/routes/user/services/user.service';

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
  }
  async validateSocialMedia(profile: any): Promise<any> {
    const social_media = await this.userService.getSocialMediaById(profile.id);
    
    if (!social_media) {
      return this.userService.addSocialMediaToUser({
              id: profile.id,
              social_media_name: profile.social_media_name,
              accessToken: profile.accessToken,
              refreshToken: profile.refreshToken,
              username: profile.username,
              img: profile.img,
              email: profile.email,
            });
    }
  }
}
