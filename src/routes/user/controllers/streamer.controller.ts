import { Controller, Patch, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { AuthUser, Roles } from '../../../utils/decorators';
import { RolGuard } from '../guards/RolGuard';
import { UserLogin } from '../types/user.types';
import { RequestService } from 'src/routes/request/services/request.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { User, SocialMedia } from '@prisma/client';
import { StreamerService } from '../services/streamer.service';

@Controller('streamer')
@UseGuards(RolGuard)
@UseGuards(AuthenticatedGuard)
export class StreamerController {
  constructor(
    private readonly userService: UserService,
    private readonly requestService: RequestService,
    private readonly streamerService: StreamerService,
  ) {}

  @Patch('profile')
  @Roles('STREAMER')
  async updateProfile(@Req() req, @Body() details: UserLogin) {
    const userId = req.user.id;
    return this.userService.updateUser(userId, details);
  }

  @Get('agency-affiliates')
  @Roles('STREAMER')
  async getAgencies(@AuthUser() user: User & { social_medias: SocialMedia[] }) {
    return this.streamerService.getStreamerAgencies(user.id);
  }

  @Get('agency-requests')
  @Roles('STREAMER')
  async getAgencyRequests(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
  ) {
    return this.requestService.getReceivedRequests(user.id);
  }

  @Patch('agency-requests/:requestId/accept')
  @Roles('STREAMER')
  async acceptAgencyRequest(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('requestId') requestId: string,
  ) {
    return this.streamerService.acceptAgencyRequest(requestId, user.id);
  }

  @Patch('agency-requests/:requestId/reject')
  @Roles('STREAMER')
  async rejectAgencyRequest(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('requestId') requestId: string,
  ) {
    return this.streamerService.rejectAgencyRequest(requestId, user.id);
  }
}
