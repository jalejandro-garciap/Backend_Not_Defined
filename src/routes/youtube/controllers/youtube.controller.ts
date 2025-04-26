import {
  Controller,
  Get,
  Header,
  Inject,
  Res,
  UseGuards,
  Body,
  Post,
  Query,
} from '@nestjs/common';
import { YoutubeService } from '../services/youtube.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { AuthUser } from 'src/utils/decorators';
import { SocialMedia, User } from '@prisma/client';
import { Response } from 'express';
import { MultiUserReportService } from 'src/reports/services/multi-user-report.service';
import { ReportFormat } from 'src/reports/interfaces/report-data.interfaces';

@Controller('youtube')
export class YoutubeController {
  constructor(
    @Inject() private readonly youtubeService: YoutubeService,
    @Inject() private readonly multiUserReportService: MultiUserReportService,
  ) {}

  // @Get('posts-metrics')
  // @UseGuards(AuthenticatedGuard)
  // async getYoutubeVideos(
  //   @AuthUser() user: User & { social_medias: SocialMedia[] },
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ) {
  //   const accessToken = user.social_medias.find(
  //     (sm) => sm.social_media_name === 'youtube',
  //   )?.access_token;
  //   if (!accessToken) {
  //     throw new Error('No se ha conectado una cuenta de YouTube');
  //   }

  //   // validate dates
  //   const start = startDate ? new Date(startDate) : undefined;
  //   if (startDate && isNaN(start.getTime())) {
  //     return { status: 400, message: 'Formato de fecha de inicio inválido' };
  //   }
  //   const end = endDate ? new Date(endDate) : undefined;
  //   if (endDate && isNaN(end.getTime())) {
  //     return { status: 400, message: 'Formato de fecha de fin inválido' };
  //   }
  //   if (start && end && start > end) {
  //     return {
  //       status: 400,
  //       message:
  //         'La fecha de inicio debe ser anterior o igual a la fecha de fin',
  //     };
  //   }

  //   // call service with optional date filter
  //   return this.youtubeService.getAllVideoMetrics(accessToken, '', {
  //     startDate: start,
  //     endDate: end,
  //   });
  // }

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

  @Post('multi-user-report')
  @UseGuards(AuthenticatedGuard)
  async generateMultiUserReport(
    @Body()
    dto: { userIds: string[]; startDate?: string; endDate?: string },
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
  ) {
    const reportFormat =
      format.toLowerCase() === 'csv' ? ReportFormat.CSV : ReportFormat.PDF;

    try {
      const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
      const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

      if (startDate && isNaN(startDate.getTime())) {
        return res
          .status(400)
          .send({ message: 'Formato de fecha de inicio inválido' });
      }

      if (endDate && isNaN(endDate.getTime())) {
        return res
          .status(400)
          .send({ message: 'Formato de fecha de fin inválido' });
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).send({
          message:
            'La fecha de inicio debe ser anterior o igual a la fecha de fin',
        });
      }

      const buffer =
        await this.multiUserReportService.generateMultiUserYoutubeReport(
          dto.userIds,
          reportFormat,
          startDate,
          endDate,
        );

      if (reportFormat === ReportFormat.CSV) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=youtube-multi-user-report.csv',
        );
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=youtube-multi-user-report.pdf',
        );
      }

      res.send(buffer);
    } catch (error) {
      console.error('Error generating multi-user YouTube report:', error);
      res
        .status(500)
        .send({ message: 'Error generating report', error: error.message });
    }
  }
}
