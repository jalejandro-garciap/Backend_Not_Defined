import { Controller, Get, Header, Inject, Res, UseGuards } from '@nestjs/common';
import { YoutubeService } from '../services/youtube.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { AuthUser } from 'src/utils/decorators';
import { SocialMedia, User } from '@prisma/client';
import { Response } from 'express';

@Controller('youtube')
export class YoutubeController {
  constructor(@Inject() private readonly youtubeService: YoutubeService) {}

  @Get('videos')
  @UseGuards(AuthenticatedGuard)
  async getYoutubeVideos(@AuthUser() user: User & { social_medias: SocialMedia[] }) {
    const accessToken = user.social_medias.find(
      (socialMedia) => socialMedia.social_media_name === 'youtube',
    )?.access_token;

    if (!accessToken) {
      throw new Error('No se ha conectado una cuenta de YouTube');
    }

    const pageToken = '';

    return this.youtubeService.getYoutubeVideos(accessToken, pageToken);
  }

  @Get('report')
  @UseGuards(AuthenticatedGuard)
  @Header('Content-Type', 'application/pdf')
  async generateReport(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Res() res: Response,
  ) {
    const accessToken = user.social_medias.find(
      (socialMedia) => socialMedia.social_media_name === 'youtube',
    )?.access_token;

    if (!accessToken) {
      throw new Error('No se ha conectado una cuenta de YouTube');
    }

    /*const pageToken = '';
    const pdfBuffer = await this.youtubeService.generateYoutubeReport(accessToken, pageToken);*/

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=youtube-report.pdf',
    );

    /*res.send(pdfBuffer);*/
  }
}
