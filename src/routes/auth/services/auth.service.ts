import { Injectable, Inject } from '@nestjs/common';
import { UserService } from 'src/routes/user/services/user.service';
import { SocialMediaLogin } from 'src/routes/user/types/user.types';

@Injectable()
export class AuthService {
  constructor(@Inject() private readonly userService: UserService) {}

  async validateUser(details: SocialMediaLogin) {
    const user = await this.userService.getUserBySocialMediaId(details.id);
    return user
      ? this.userService.updateUser(user, details)
      : this.userService.createUser(details);
  }
}
