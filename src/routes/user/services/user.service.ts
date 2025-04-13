import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core/inject.decorator';
import { UserLogin } from '../types/user.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { Social } from '../types/social.types';

@Injectable()
export class UserService {
  constructor(@Inject() private readonly prisma: PrismaService) {}

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

  getSocialMediaById(id: string) {
    return this.prisma.socialMedia.findUnique({
      where: {
        id: id
      }
    });
  }

  async addSocialMediaToUser(details: Social) {
    
    const session = await this.prisma.session.findFirst();

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
        social_media_name: details.social_media_name,
        access_token: details.accessToken,
        refresh_token: details.refreshToken,
        user: {	
          connect: { id: user.id },
        },
      },
    });
  }

}
