import { Controller, Get, Header, Inject, Res, UseGuards } from '@nestjs/common';
import { TiktokService } from '../services/tiktok.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { AuthUser } from 'src/utils/decorators';
import { SocialMedia, User } from '@prisma/client';
import { Response } from 'express';

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

    const cursor = 0;

    return this.tiktokService.getTiktokVideos(accessToken, cursor);
  }

  @Get('report')
  @UseGuards(AuthenticatedGuard)
  @Header('Content-Type', 'application/pdf')
  async generateReport(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Res() res: Response,
  ) {
    const accessToken = user.social_medias.find(
      (socialMedia) => socialMedia.social_media_name === 'tiktok',
    )?.access_token;

    if (!accessToken) {
      throw new Error('No TikTok account connected');
    }

    const cursor = 0;
    const pdfBuffer = await this.tiktokService.generateTikTokReport(
      accessToken,
      cursor,
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=tiktok-report.pdf',
    );

    res.send(pdfBuffer);
  }
}
