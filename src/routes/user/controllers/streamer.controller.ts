import { Controller, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { Roles } from '../../../utils/decorators';
import { RolGuard } from '../guards/RolGuard';
import { UserLogin } from '../types/user.types';

@Controller('streamer')
@UseGuards(RolGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('profile')
  @Roles('STREAMER')
  async updateProfile(@Req() req, @Body() details: UserLogin) {
    const userId = req.user.id;
    return this.userService.updateUser(userId, details);
  }
}