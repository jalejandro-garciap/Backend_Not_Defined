import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Sponsor } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAgencies(): Promise<Sponsor[]> {
    return this.prisma.sponsor.findMany();
  }

  async createAgency(data: Sponsor): Promise<Sponsor> {
    return this.prisma.sponsor.create({
      data,
    });
  }

  async updateAgency(id: string, data: Sponsor): Promise<Sponsor> {
    return this.prisma.sponsor.update({
      where: { id },
      data,
    });
  }

  async assignAgencyToUser(userId: string, agencyId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const agencyExists = await this.prisma.sponsor.findUnique({
      where: { id: agencyId },
    });

    if (!user || !agencyExists) {
      throw new BadRequestException('User or Agency not found');
    }

    if (role !== 'manager') {
      throw new BadRequestException(
        'Only manager role is supported for agency assignments',
      );
    }

    const existingManagerRelation =
      await this.prisma.managerOnSponsor.findFirst({
        where: { userId },
      });

    if (existingManagerRelation) {
      if (existingManagerRelation.sponsorId === agencyId) {
        return existingManagerRelation;
      } else {
        throw new BadRequestException(
          'User already manages another agency. Remove that assignment first.',
        );
      }
    }

    const existingSponsorManager = await this.prisma.managerOnSponsor.findFirst(
      {
        where: { sponsorId: agencyId },
      },
    );

    if (existingSponsorManager) {
      throw new BadRequestException(
        'Agency already has a manager. Remove that assignment first.',
      );
    }

    if (user.role !== 'MANAGER') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: 'MANAGER' },
      });
    }

    return this.prisma.managerOnSponsor.create({
      data: {
        userId,
        sponsorId: agencyId,
      },
      include: {
        user: true,
        sponsor: true,
      },
    });
  }

  async removeAgencyFromUser(userId: string, agencyId: string) {
    const managerRelation = await this.prisma.managerOnSponsor.findFirst({
      where: {
        userId,
        sponsorId: agencyId,
      },
    });

    if (managerRelation) {
      return this.prisma.managerOnSponsor.delete({
        where: { id: managerRelation.id },
      });
    }

    const streamerRelation = await this.prisma.streamerOnSponsor.findFirst({
      where: {
        userId,
        sponsorId: agencyId,
      },
    });

    if (streamerRelation) {
      return this.prisma.streamerOnSponsor.delete({
        where: { id: streamerRelation.id },
      });
    }

    throw new BadRequestException(
      'No assignment found for this user and agency',
    );
  }

  async getUserAgencyAssignments(userId: string) {
    const managerAssignments = await this.prisma.managerOnSponsor.findMany({
      where: { userId },
      include: { sponsor: true },
    });

    const streamerAssignments = await this.prisma.streamerOnSponsor.findMany({
      where: { userId },
      include: { sponsor: true },
    });

    const managerMapped = managerAssignments.map((assign) => ({
      id: assign.id,
      userId: assign.userId,
      agencyId: assign.sponsorId,
      role: 'manager',
      since: assign.since,
      agency: assign.sponsor,
    }));

    const streamerMapped = streamerAssignments.map((assign) => ({
      id: assign.id,
      userId: assign.userId,
      agencyId: assign.sponsorId,
      role: 'streamer',
      since: assign.since,
      agency: assign.sponsor,
    }));

    return [...managerMapped, ...streamerMapped];
  }

  async updateUserAgencyAssignments(userId: string, agencyIds: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const currentAssignments = await this.prisma.managerOnSponsor.findMany({
      where: { userId },
    });

    const currentAgencyIds = currentAssignments.map((a) => a.sponsorId);

    const agencyIdsToAdd = agencyIds.filter(
      (id) => !currentAgencyIds.includes(id),
    );
    const agencyIdsToRemove = currentAgencyIds.filter(
      (id) => !agencyIds.includes(id),
    );

    return this.prisma.$transaction(async (tx) => {
      if (agencyIdsToRemove.length > 0) {
        await tx.managerOnSponsor.deleteMany({
          where: {
            userId,
            sponsorId: { in: agencyIdsToRemove },
          },
        });
      }

      for (const agencyId of agencyIdsToAdd) {
        const existingRelation = await tx.managerOnSponsor.findFirst({
          where: {
            userId,
            sponsorId: agencyId,
          },
        });

        if (!existingRelation) {
          await tx.managerOnSponsor.create({
            data: {
              userId,
              sponsorId: agencyId,
            },
          });
        }
      }

      if (agencyIds.length > 0 && user.role !== 'MANAGER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'MANAGER' },
        });
      } else if (agencyIds.length === 0 && user.role === 'MANAGER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'USER' },
        });
      }

      return this.getUserAgencyAssignments(userId);
    });
  }

  async getAgenciesWithManagerInfo(): Promise<any[]> {
    const agencies = await this.prisma.sponsor.findMany();
    const managerAssignments = await this.prisma.managerOnSponsor.findMany();

    return agencies.map((agency) => {
      const manager = managerAssignments.find((m) => m.sponsorId === agency.id);
      return {
        ...agency,
        managerUserId: manager?.userId || null,
      };
    });
  }
}
