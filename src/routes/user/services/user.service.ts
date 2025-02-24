import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core/inject.decorator';
import { SocialMediaLogin } from '../types/user.types';
import { PrismaService } from 'src/routes/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(@Inject() private readonly prisma: PrismaService) {}

  async createUser(details: SocialMediaLogin): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: details.email,
        username: details.username,
        profile_image: details.img,
        role: 'USER',
        phone: '',
        social_medias: {
          create: {
            id: details.id,
            social_media_name: details.social_media_name,
            access_token: details.accessToken,
            refresh_token: details.refreshToken,
          },
        },
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

  async getUserBySocialMediaId(socialMediaId: string) {
    return this.prisma.user.findFirst({
      where: {
        social_medias: {
          some: {
            id: socialMediaId,
          },
        },
      },
    });
  }

  updateUser(user: User, details: SocialMediaLogin) {
    return this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        username: details.username,
        profile_image: details.img,
        social_medias: {
          upsert: {
            where: {
              id: details.id,
            },
            update: {
              access_token: details.accessToken,
              refresh_token: details.refreshToken,
            },
            create: {
              social_media_name: details.social_media_name,
              access_token: details.accessToken,
              refresh_token: details.refreshToken,
            },
          },
        },
      },
    });
  }
}
