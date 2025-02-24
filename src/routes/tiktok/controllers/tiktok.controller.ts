import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { TiktokService } from '../services/tiktok.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { AuthUser } from 'src/utils/decorators';
import { SocialMedia, User } from '@prisma/client';

@Controller('tiktok')
export class TiktokController {
  constructor(@Inject() private readonly tiktokService: TiktokService) {}

  @Get('videos')
  @UseGuards(AuthenticatedGuard)
  getTiktokVideos(@AuthUser() user: User & { social_medias: SocialMedia[] }) {
    const accessToken = user.social_medias.find(
      (socialMedia) => socialMedia.social_media_name === 'tiktok',
    )?.access_token;

    if (!accessToken) {
      throw new Error('No TikTok account connected');
    }

    return this.tiktokService.getTiktokVideos(accessToken);
  }
}
