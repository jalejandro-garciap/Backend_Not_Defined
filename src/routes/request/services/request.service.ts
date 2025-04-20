import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(
    senderId: string,
    recipientId: string,
    comment: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.request.create({
      data: {
        comment,
        startDate,
        endDate,
        sender: { connect: { id: senderId } },
        recipient: { connect: { id: recipientId } },
      },
    });
  }

  async getAgencyPendingStreamers(sponsorId: string) {
    const pendingRequests = await this.prisma.request.findMany({
      where: { senderId: sponsorId, status: 'pending' },
      select: {
        recipient: {
          select: {
            id: true,
            username: true,
            profile_img: true,
          },
        },
      },
    });

    return pendingRequests.map((request) => ({
      id: request.recipient.id,
      name: request.recipient.username,
      profile_img: request.recipient.profile_img,
    }));
  }

  async getReceivedRequests(userId: string) {
    const requests = await this.prisma.request.findMany({
      where: { recipientId: userId, status: 'pending' },
      select: {
        id: true,
        status: true,
        comment: true,
        startDate: true,
        endDate: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return requests.map((request) => ({
      id: request.id,
      agency: {
        id: request.sender.id,
        name: request.sender.name,
      },
      comment: request.comment,
      status: request.status,
      startDate: request.startDate,
      endDate: request.endDate,
    }));
  }

  async updateRequestStatus(requestId: string, status: string) {
    return this.prisma.request.update({
      where: { id: requestId },
      data: { status },
    });
  }

  async deleteRequest(requestId: string) {
    return this.prisma.request.delete({
      where: { id: requestId },
    });
  }
}
