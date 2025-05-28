import {
  Controller,
  UseGuards,
  Get,
  Param,
  Delete,
  Post,
  Body,
  Query,
  Res,
  Inject,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { AuthUser, Roles } from '../../../utils/decorators';
import { RolGuard } from '../guards/RolGuard';
import { UserLogin } from '../types/user.types';
import { RequestService } from 'src/routes/request/services/request.service';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { User, SocialMedia } from '@prisma/client';
import { MultiUserReportService } from 'src/reports/services/multi-user-report.service';
import { ReportFormat } from 'src/reports/interfaces/report-data.interfaces';
import { Response } from 'express';
import { TokenValidationService } from 'src/routes/auth/services/token-validation.service';

@Controller('manager')
@UseGuards(RolGuard)
@UseGuards(AuthenticatedGuard)
export class ManagerController {
  constructor(
    private readonly userService: UserService,
    private readonly requestService: RequestService,
    private readonly multiUserReportService: MultiUserReportService,
    @Inject() private readonly tokenValidationService: TokenValidationService,
  ) {}

  @Get('agencies')
  @Roles('MANAGER')
  async getAgencies(@AuthUser() user: User & { social_medias: SocialMedia[] }) {
    return this.userService.getManagerAgencies(user.id);
  }

  @Get('agency-streamers/:agencyId')
  @Roles('MANAGER')
  async getAgencyRequests(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('agencyId') agencyId: string,
  ) {
    return this.userService.getAgencyStreamers(agencyId);
  }

  @Get('agency-streamers-tokens/:agencyId')
  @Roles('MANAGER')
  async getAgencyStreamersTokens(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('agencyId') agencyId: string,
  ) {
    const streamers = await this.userService.getAgencyStreamersWithSocialMedia(agencyId);
    
    const streamersWithTokenStatus = await Promise.all(
      streamers.map(async (streamer) => {
        const socialMediasWithStatus = await Promise.all(
          streamer.socialMedias.map(async (sm) => {
            try {
              const isExpiring = sm.token_expires_at
                ? this.tokenValidationService.isTokenExpiring(sm.token_expires_at)
                : true;

              return {
                id: sm.id,
                platform: sm.social_media_name,
                username: sm.username,
                tokenStatus: {
                  id: sm.id,
                  platform: sm.social_media_name,
                  username: sm.username,
                  tokenExpiresAt: sm.token_expires_at,
                  isExpiring,
                  needsRefresh: isExpiring,
                },
              };
            } catch (error) {
              console.error(`Error checking token for ${sm.id}:`, error);
              return {
                id: sm.id,
                platform: sm.social_media_name,
                username: sm.username,
                tokenStatus: {
                  id: sm.id,
                  platform: sm.social_media_name,
                  username: sm.username,
                  tokenExpiresAt: sm.token_expires_at,
                  isExpiring: true,
                  needsRefresh: true,
                },
              };
            }
          })
        );

        return {
          streamerId: streamer.id,
          streamerName: streamer.name,
          socialMedias: socialMediasWithStatus,
        };
      })
    );

    return streamersWithTokenStatus;
  }

  @Get('agency-pending-streamers/:agencyId')
  @Roles('MANAGER')
  async getAgencyPendingStreamers(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('agencyId') agencyId: string,
  ) {
    return this.requestService.getAgencyPendingStreamers(agencyId);
  }

  @Delete('remove-streamer/:agencyId/:streamerId')
  @Roles('MANAGER')
  async removeStreamerFromAgency(
    @AuthUser() user: UserLogin,
    @Param('agencyId') agencyId: string,
    @Param('streamerId') streamerId: string,
  ) {
    return this.userService.removeStreamerFromAgency(agencyId, streamerId);
  }

  @Get('search-streamer/:agencyId/:query')
  @Roles('MANAGER')
  async searchStreamer(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('agencyId') agencyId: string,
    @Param('query') query: string,
  ) {
    return this.userService.searchStreamer(agencyId, query);
  }

  @Post('streamer-request/:agencyId/:streamerId')
  @Roles('MANAGER')
  async createRequest(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Param('agencyId') agencyId: string,
    @Param('streamerId') streamerId: string,
    @Body()
    requestData: { startDate: string; endDate: string; comment?: string },
  ) {
    return this.requestService.createRequest(
      agencyId,
      streamerId,
      requestData.comment || null,
      new Date(requestData.startDate),
      new Date(requestData.endDate),
    );
  }

  @Post('streamer-report')
  @Roles('MANAGER')
  async generateReport(
    @Body()
    dto: {
      streamerIds: string[];
      startDate?: string;
      endDate?: string;
      hashtags?: string[];
    },
    @Query('socialMedia') socialMedia: string,
    @Query('format') format: string = 'csv',
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
        socialMedia === 'tiktok'
          ? await this.multiUserReportService.generateMultiUserTikTokReport(
              dto.streamerIds,
              reportFormat,
              startDate,
              endDate,
              dto.hashtags,
            )
          : socialMedia === 'instagram'
            ? await this.multiUserReportService.generateMultiUserInstagramReport(
                dto.streamerIds,
                reportFormat,
                startDate,
                endDate,
                dto.hashtags,
              )
            : await this.multiUserReportService.generateMultiUserYoutubeReport(
                dto.streamerIds,
                reportFormat,
                startDate,
                endDate,
                dto.hashtags,
              );

      if (reportFormat === ReportFormat.CSV) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=tiktok-multi-user-report.csv',
        );
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=tiktok-multi-user-report.pdf',
        );
      }

      res.send(buffer);
    } catch (error) {
      console.error('Error generating multi-user report:', error);
      res
        .status(500)
        .send({ message: 'Error generating report', error: error.message });
    }
  }
}
