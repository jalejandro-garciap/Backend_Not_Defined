import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core/inject.decorator';
import { UserLogin } from '../types/user.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { Social } from '../types/social.types';
import { RequestService } from 'src/routes/request/services/request.service';

@Injectable()
export class UserService {
  constructor(
    @Inject() private readonly prisma: PrismaService,
    @Inject() private readonly requestService: RequestService,
  ) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        managerOnSponsors: true,
      },
    });
  }

  async createUser(details: UserLogin): Promise<User> {
    return this.prisma.user.create({
      data: {
        id: details.id,
        first_name: details.firstname,
        last_name: details.lastname,
        email: details.email,
        username: details.username,
        profile_img: details.img,
        role: 'STREAMER',
        phone: '',
      },
    });
  }

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        social_medias: true,
      },
    });
  }

  async getUserWithTokenStatus(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        social_medias: true,
      },
    });

    if (!user) {
      return null;
    }

    const socialMediasWithStatus = user.social_medias.map((socialMedia) => {
      const now = new Date();
      const isTokenExpired = socialMedia.token_expires_at
        ? socialMedia.token_expires_at < now
        : false;

      return {
        ...socialMedia,
        isTokenExpired,
      };
    });

    return {
      ...user,
      social_medias: socialMediasWithStatus,
    };
  }

  async getUserByMail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        social_medias: true,
      },
    });
  }

  updateUser(user: User, details: UserLogin) {
    return this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        id: details.id,
        first_name: details.firstname,
        last_name: details.lastname,
        email: details.email,
        username: details.username,
        profile_img: details.img,
        role: 'STREAMER',
        phone: '',
      },
    });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        social_medias: true,
      },
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  getSocialMediaById(id: string) {
    return this.prisma.socialMedia.findUnique({
      where: {
        id: id,
      },
    });
  }

  getSocialMediaByNameAndUserId(name: string, userId: string) {
    return this.prisma.socialMedia.findFirst({
      where: {
        social_media_name: name,
        user_id: userId,
      },
    });
  }

  async deleteSocialMedia(id: string) {
    return this.prisma.socialMedia.delete({
      where: {
        id: id,
      },
    });
  }

  getManagerAgencies(userId: string) {
    return this.prisma.sponsor.findMany({
      where: {
        managers: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async removeStreamerFromAgency(agencyId: string, streamerId: string) {
    const streamerOnSponsor = await this.prisma.streamerOnSponsor.findFirst({
      where: {
        userId: streamerId,
        sponsorId: agencyId,
      },
    });

    if (!streamerOnSponsor) {
      throw new Error('StreamerOnSponsor not found');
    }

    return this.prisma.streamerOnSponsor.delete({
      where: {
        id: streamerOnSponsor.id,
      },
    });
  }

  async getAgencyStreamers(agencyId: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: {
        id: agencyId,
      },
      include: {
        streamers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile_img: true,
                social_medias: {
                  select: {
                    social_media_name: true,
                    username: true,
                    token_expires_at: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return (
      sponsor?.streamers.map((streamer) => {
        const streamerData = streamer.user;
        const now = new Date();

        const connectedSocials = streamer.user.social_medias.reduce(
          (acc, social) => {
            const isExpired = social.token_expires_at
              ? social.token_expires_at < now
              : false;

            acc[social.social_media_name] = {
              connected: true,
              isTokenExpired: isExpired,
              username: social.username,
            };
            return acc;
          },
          {} as Record<
            string,
            { connected: boolean; isTokenExpired: boolean; username: string }
          >,
        );

        return {
          id: streamerData.id,
          name: streamerData.username,
          imageUrl: streamerData.profile_img,
          connectedSocials,
        };
      }) || []
    );
  }

  async searchStreamer(agencyId: string, query: string) {
    const agency = await this.prisma.sponsor.findUnique({
      where: {
        id: agencyId,
      },
      select: {
        streamers: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!agency) {
      throw new Error('Agency not found');
    }

    const pendignStreamers =
      await this.requestService.getAgencyPendingStreamers(agencyId);

    const pendingStreamersIds = pendignStreamers.map((streamer) => streamer.id);

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
            },
            role: 'STREAMER',
          },
          {
            social_medias: {
              some: {
                username: {
                  contains: query,
                },
              },
            },
            role: 'STREAMER',
          },
        ],
        AND: [
          {
            id: {
              notIn: agency.streamers.map((streamer) => streamer.userId),
            },
          },
          {
            id: {
              notIn: pendingStreamersIds,
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        profile_img: true,
        social_medias: {
          select: {
            social_media_name: true,
            username: true,
          },
        },
      },
    });

    return users.map((user) => {
      const socialUsernames = user.social_medias.reduce(
        (acc, social) => {
          acc[social.social_media_name] = social.username;
          return acc;
        },
        {} as Record<string, string>,
      );

      return {
        id: user.id,
        name: user.username,
        imageUrl: user.profile_img,
        socialUsernames,
      };
    });
  }

  async addSocialMediaToUser(details: Social, sessionId?: string) {
    let session;

    if (sessionId) {
      session = await this.prisma.session.findUnique({
        where: {
          sid: sessionId,
        },
      });
    } else {
      session = await this.prisma.session.findFirst();
    }

    if (!session) {
      throw new Error('Session not found');
    }

    const sessionData = JSON.parse(session.data);
    const user = sessionData.passport?.user;

    if (!user) {
      throw new Error('User not found');
    }

    return this.prisma.socialMedia.create({
      data: {
        id: details.id,
        username: details.username,
        social_media_name: details.social_media_name,
        access_token: details.accessToken,
        refresh_token: details.refreshToken,
        token_expires_at: details.accessTokenExpiresAt,
        user: {
          connect: { id: user.id },
        },
      },
    });
  }

  async updateSocialMediaTokens(
    socialMediaId: string,
    accessToken: string,
    refreshToken: string | null,
    accessTokenExpiresAt: Date | null,
  ) {
    const dataToUpdate: any = {
      access_token: accessToken,
      token_expires_at: accessTokenExpiresAt,
      last_connection: new Date(),
    };
    if (refreshToken) {
      dataToUpdate.refresh_token = refreshToken;
    }
    return this.prisma.socialMedia.update({
      where: {
        id: socialMediaId,
      },
      data: dataToUpdate,
    });
  }

  async getExpiringSocialMediaTokens() {
    const now = new Date();
    
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.socialMedia.findMany({
      where: {
        OR: [
          {
            social_media_name: 'youtube',
            token_expires_at: {
              lte: thirtyMinutesFromNow,
              gte: now,
            },
            access_token: {
              not: 'EXPIRED_TOKEN',
            },
          },
          {
            social_media_name: {
              in: ['instagram', 'tiktok'],
            },
            token_expires_at: {
              lte: oneDayFromNow,
              gte: now,
            },
            access_token: {
              not: 'EXPIRED_TOKEN',
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }
}
