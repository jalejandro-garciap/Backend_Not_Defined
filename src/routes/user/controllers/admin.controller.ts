import { Controller, Get, Delete, Param, UseGuards, Patch, Body } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { Roles } from '../../../utils/decorators';
import { RolGuard } from '../guards/RolGuard';
import { UserLogin } from '../types/user.types';

@Controller('admin')
@UseGuards(RolGuard)
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  @Roles('ADMINISTRATOR')
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Delete('users/:id')
  @Roles('ADMINISTRATOR')
  async deleteUser(@Param('id') userId: string) {
    return this.userService.deleteUser(userId);
  }

  @Patch('users/:id')
  @Roles('ADMINISTRATOR')
  async updateUser(@Param('id') userId: string, @Body() details: UserLogin) {
    const user = await this.userService.getUserById(userId);
    return this.userService.updateUser(user, details);
  }
}