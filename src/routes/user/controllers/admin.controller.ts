import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Patch,
  Body,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { Roles } from '../../../utils/decorators';
import { RolGuard } from '../guards/RolGuard';
import { UserLogin } from '../types/user.types';
import { AdminService } from '../services/admin.service';
import { Sponsor } from '@prisma/client';

@Controller('admin')
@UseGuards(RolGuard)
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly adminService: AdminService,
  ) {}

  @Get('users')
  @Roles('ADMIN')
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Delete('users/:id')
  @Roles('ADMIN')
  async deleteUser(@Param('id') userId: string) {
    return this.userService.deleteUser(userId);
  }

  @Patch('users/:id')
  @Roles('ADMIN')
  async updateUser(@Param('id') userId: string, @Body() details: UserLogin) {
    const user = await this.userService.getUserById(userId);
    return this.userService.updateUser(user, details);
  }

  @Get('agencies')
  @Roles('ADMIN')
  async getAgencies(): Promise<Sponsor[]> {
    return this.adminService.getAgencies();
  }

  @Post('agencies')
  @Roles('ADMIN')
  async createAgency(@Body() createAgencyDto: Sponsor): Promise<Sponsor> {
    return this.adminService.createAgency(createAgencyDto);
  }

  @Put('agencies/:id')
  @Roles('ADMIN')
  async updateAgency(
    @Body() updateAgencyDto: Sponsor,
    @Param('id') id: string,
  ): Promise<Sponsor> {
    return this.adminService.updateAgency(id, updateAgencyDto);
  }

  @Get('agencies-with-managers')
  @Roles('ADMIN')
  async getAgenciesWithManagers() {
    return this.adminService.getAgenciesWithManagerInfo();
  }

  @Post('users/:userId/agencies')
  @Roles('ADMIN')
  async assignAgencyToUser(
    @Param('userId') userId: string,
    @Body() assignData: { agencyId: string; role: string },
  ) {
    return this.adminService.assignAgencyToUser(
      userId,
      assignData.agencyId,
      assignData.role,
    );
  }

  @Delete('users/:userId/agencies/:agencyId')
  @Roles('ADMIN')
  async removeAgencyFromUser(
    @Param('userId') userId: string,
    @Param('agencyId') agencyId: string,
  ) {
    return this.adminService.removeAgencyFromUser(userId, agencyId);
  }

  @Get('users/:userId/agencies')
  @Roles('ADMIN')
  async getUserAgencies(@Param('userId') userId: string) {
    return this.adminService.getUserAgencyAssignments(userId);
  }

  @Post('users/:userId/bulk-agency-assignments')
  @Roles('ADMIN')
  async updateUserAgencies(
    @Param('userId') userId: string,
    @Body() updateData: { agencyIds: string[] },
  ) {
    return this.adminService.updateUserAgencyAssignments(
      userId,
      updateData.agencyIds,
    );
  }
}
