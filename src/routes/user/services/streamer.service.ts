import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestService } from 'src/routes/request/services/request.service';

@Injectable()
export class StreamerService {
  constructor(
    @Inject() private readonly prisma: PrismaService,
    @Inject() private readonly requestService: RequestService,
  ) {}

  getStreamerAgencies(userId: string) {
    return this.prisma.sponsor.findMany({
      where: {
        streamers: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async acceptAgencyRequest(requestId: string, userId: string) {
    const request = await this.prisma.request.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.recipientId !== userId) {
      throw new Error('You are not authorized to accept this request');
    }

    await this.requestService.updateRequestStatus(requestId, 'accepted');

    await this.prisma.streamerOnSponsor.create({
      data: {
        userId: request.recipientId,
        sponsorId: request.senderId,
      },
    });

    return this.prisma.request.delete({
      where: {
        id: requestId,
      },
    });
  }

  async rejectAgencyRequest(requestId: string, userId: string) {
    const request = await this.prisma.request.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.recipientId !== userId) {
      throw new Error('You are not authorized to reject this request');
    }

    await this.requestService.updateRequestStatus(requestId, 'rejected');

    return this.prisma.request.delete({
      where: {
        id: requestId,
      },
    });
  }
}
