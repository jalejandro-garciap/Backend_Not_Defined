import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(senderId: string, recipientId: string, comment: string, duration: Date) {
    return this.prisma.request.create({
      data: {
        senderId,
        recipientId,
        comment,
        duration,
      },
    });
  }

  async getSentRequests(userId: string) {
    return this.prisma.request.findMany({
      where: { senderId: userId },
      include: { recipient: true },
    });
  }

  async getReceivedRequests(userId: string) {
    return this.prisma.request.findMany({
      where: { recipientId: userId },
      include: { sender: true },
    });
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