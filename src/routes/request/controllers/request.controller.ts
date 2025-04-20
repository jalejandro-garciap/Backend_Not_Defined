import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RequestService } from '../services/request.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';

@Controller('requests')
@UseGuards(AuthenticatedGuard)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Get('received/:userId')
  async getReceivedRequests(@Param('userId') userId: string) {
    return this.requestService.getReceivedRequests(userId);
  }

  @Patch(':id/status')
  async updateRequestStatus(
    @Param('id') requestId: string,
    @Body('status') status: string,
  ) {
    return this.requestService.updateRequestStatus(requestId, status);
  }

  @Delete(':id')
  async deleteRequest(@Param('id') requestId: string) {
    return this.requestService.deleteRequest(requestId);
  }
}
