import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { InstagramService } from '../services/instagram.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { AuthUser } from 'src/utils/decorators';
import { SocialMedia, User } from '@prisma/client';

@Controller('instagram')
export class InstagramController {
  constructor(@Inject() private readonly instagramService: InstagramService) {}

  @Get('posts-metrics')
  @UseGuards(AuthenticatedGuard)
  async getAllPostsMetrics(@AuthUser() user: User & { social_medias: SocialMedia[] }) {
    const accessToken = user.social_medias.find(
      (socialMedia) => socialMedia.social_media_name === 'instagram',
    )?.access_token;

    if (!accessToken) {
      throw new Error('No Instagram account connected');
    }

    try {
      return await this.instagramService.getAllPostsMetrics(accessToken);
    } catch (error) {
      console.error('Error fetching posts metrics:', error);
      throw new Error('Failed to fetch posts metrics');
    }
  }
}
