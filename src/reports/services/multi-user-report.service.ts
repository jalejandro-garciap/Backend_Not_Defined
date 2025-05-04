import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TiktokService } from 'src/routes/tiktok/services/tiktok.service';
import { ReportService } from './report.service';
import { ReportFormat } from '../interfaces/report-data.interfaces';
import { InstagramService } from 'src/routes/instagram/services/instagram.service';
import { YoutubeService } from 'src/routes/youtube/services/youtube.service';

@Injectable()
export class MultiUserReportService {
  constructor(
    @Inject() private readonly prismaService: PrismaService,
    @Inject() private readonly youtubeService: YoutubeService,
    private readonly tiktokService: TiktokService,
    private readonly instagramService: InstagramService,
    private readonly reportService: ReportService,
  ) {}

  async generateMultiUserTikTokReport(
    userIds: string[],
    format: ReportFormat = ReportFormat.PDF,
    startDate?: Date,
    endDate?: Date,
    hashtags?: string[],
  ): Promise<Buffer> {
    const dateRange =
      startDate || endDate
        ? {
            startDate,
            endDate,
          }
        : undefined;
    const applyHashtagFilter = dateRange && hashtags && hashtags.length > 0;

    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: userIds },
      },
      include: {
        social_medias: {
          where: {
            social_media_name: 'tiktok',
            enabled: true,
          },
        },
      },
    });

    const usersWithTikTok = users.filter(
      (user) => user.social_medias && user.social_medias.length > 0,
    );

    if (usersWithTikTok.length === 0) {
      throw new Error('No valid TikTok accounts found for the selected users');
    }

    const allVideosPromises = usersWithTikTok.map(async (user) => {
      const accessToken = user.social_medias[0].access_token;
      const videos = await this.tiktokService.getAllTiktokVideos(
        accessToken,
        dateRange,
        applyHashtagFilter ? hashtags : undefined,
        5,
      );
      const videosWithUserInfo = videos.map((video) => ({
        ...video,
        user: {
          id: user.id,
          username: user.username,
          profile_image: user.profile_img,
        },
      }));

      return videosWithUserInfo;
    });

    const allVideoArrays = await Promise.all(allVideosPromises);
    const combinedVideos = allVideoArrays.flat();

    if (combinedVideos.length === 0) {
      throw new Error(
        'No se encontraron videos que coincidan con los criterios seleccionados',
      );
    }

    let reportTitle = 'Informe TikTok Multi-Usuario';
    let reportSubtitle = 'Informe de rendimiento de videos de TikTok';
    if (startDate || endDate) {
      reportSubtitle = '';
      reportSubtitle += 'Periodo: ';
      if (startDate) {
        reportSubtitle += this.formatDateForTitle(startDate);
      } else {
        reportSubtitle += 'Inicio';
      }
      reportSubtitle += ' a ';
      if (endDate) {
        reportSubtitle += this.formatDateForTitle(endDate);
      } else {
        reportSubtitle += 'Actual';
      }
    }
    if (applyHashtagFilter) {
      reportSubtitle += ` | Hashtags: ${hashtags.join(', ')}`;
    }

    return this.reportService.generateMultiUserTikTokReport(
      combinedVideos,
      usersWithTikTok,
      format,
      reportTitle,
      reportSubtitle,
    );
  }

  async generateMultiUserInstagramReport(
    userIds: string[],
    format: ReportFormat = ReportFormat.PDF,
    startDate?: Date,
    endDate?: Date,
    hashtags?: string[],
  ): Promise<Buffer> {
    const dateRange =
      startDate || endDate
        ? {
            startDate,
            endDate,
          }
        : undefined;
    const applyHashtagFilter = dateRange && hashtags && hashtags.length > 0;

    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: userIds },
      },
      include: {
        social_medias: {
          where: {
            social_media_name: 'instagram',
            enabled: true,
          },
        },
      },
    });

    const usersWithInstagram = users.filter(
      (user) => user.social_medias && user.social_medias.length > 0,
    );

    if (usersWithInstagram.length === 0) {
      throw new Error(
        'No valid Instagram accounts found for the selected users',
      );
    }

    const allMediaPromises = usersWithInstagram.map(async (user) => {
      const accessToken = user.social_medias[0].access_token;

      const media =
        await this.instagramService.getAllPostsMetricsWithDateFilter(
          accessToken,
          dateRange,
          applyHashtagFilter ? hashtags : undefined,
        );

      const mediaWithUserInfo = media.map((mediaItem) => ({
        ...mediaItem,
        user: {
          id: user.id,
          username: user.username,
          profile_image: user.profile_img,
        },
      }));

      return mediaWithUserInfo;
    });

    const allMediaArrays = await Promise.all(allMediaPromises);
    const combinedMedia = allMediaArrays.flat();

    if (combinedMedia.length === 0) {
      throw new Error(
        'No se encontraron publicaciones que coincidan con los criterios seleccionados',
      );
    }

    let reportTitle = 'Informe Instagram Multi-Usuario';
    let reportSubtitle = 'Informe de rendimiento de publicaciones de Instagram';

    if (startDate || endDate) {
      reportSubtitle = '';
      reportSubtitle += 'Periodo: ';
      if (startDate) {
        reportSubtitle += this.formatDateForTitle(startDate);
      } else {
        reportSubtitle += 'Inicio';
      }
      reportSubtitle += ' a ';
      if (endDate) {
        reportSubtitle += this.formatDateForTitle(endDate);
      } else {
        reportSubtitle += 'Actual';
      }
    }
    if (applyHashtagFilter) {
      reportSubtitle += ` | Hashtags: ${hashtags.join(', ')}`;
    }

    return this.reportService.generateMultiUserInstagramReport(
      combinedMedia,
      usersWithInstagram,
      format,
      reportTitle,
      reportSubtitle,
    );
  }

  async generateMultiUserYoutubeReport(
    userIds: string[],
    format: ReportFormat,
    startDate?: Date,
    endDate?: Date,
    hashtags?: string[],
  ): Promise<Buffer> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    const applyHashtagFilter = dateRange && hashtags && hashtags.length > 0;

    const users = await this.prismaService.user.findMany({
      where: { id: { in: userIds } },
      include: {
        social_medias: {
          where: { social_media_name: 'youtube', enabled: true },
        },
      },
    });
    const usersWithYoutube = users.filter((u) => u.social_medias.length > 0);
    if (usersWithYoutube.length === 0) {
      throw new Error('No valid YouTube accounts found for the selected users');
    }

    // fetch & tag each user’s metrics
    const metricsArrays = await Promise.all(
      usersWithYoutube.map(async (user) => {
        const token = user.social_medias[0].access_token;
        const publishedAfter = dateRange?.startDate?.toISOString();
        const publishedBefore = dateRange?.endDate?.toISOString();

        // Pass hashtags only if dateRange is present
        const allMetrics = await this.youtubeService.getAllVideoMetrics(
          token,
          publishedAfter,
          publishedBefore,
          applyHashtagFilter ? hashtags : undefined,
        );

        return allMetrics.map((m) => ({
          ...m,
          user: {
            id: user.id,
            username: user.username,
            profile_image: user.profile_img,
          },
        }));
      }),
    );
    const combined = metricsArrays.flat();
    if (combined.length === 0) {
      throw new Error(
        'No se encontraron videos que coincidan con los criterios seleccionados',
      );
    }

    let reportTitle = 'Informe YouTube Multi-Usuario';
    let reportSubtitle = 'Informe de rendimiento de videos de YouTube';
    if (startDate || endDate) {
      reportSubtitle = `Periodo: ${
        startDate ? this.formatDateForTitle(startDate) : 'Inicio'
      } a ${endDate ? this.formatDateForTitle(endDate) : 'Actual'}`;
    }
    if (applyHashtagFilter) {
      reportSubtitle += ` | Hashtags: ${hashtags.join(', ')}`;
    }

    return this.reportService.generateMultiUserYoutubeReport(
      combined,
      usersWithYoutube,
      format,
      reportTitle,
      reportSubtitle,
    );
  }

  private formatDateForTitle(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    const formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
  }
}
