import { Injectable } from '@nestjs/common';
import { PdfService } from './utils/pdf.service';
import { ReportData, ReportFormat } from '../interfaces/report-data.interfaces';
import { ChartService } from './utils/chart.service';
import { CsvService } from './utils/csv.service';
import { TikTokVideo } from 'src/routes/tiktok/utils/interfaces/tiktok_video.interface';
import { SocialMedia, User } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(
    private readonly pdfService: PdfService,
    private readonly chartService: ChartService,
    private readonly csvService: CsvService,
  ) {}

  async generateMultiUserTikTokReport(
    videos: (TikTokVideo & {
      user: { id: string; username: string; profile_image: string };
    })[],
    users: (User & { social_medias: SocialMedia[] })[],
    format: ReportFormat = ReportFormat.PDF,
    reportTitle: string = 'Informe TikTok Multi-Usuario',
    reportSubtitle: string = 'Informe de rendimiento de videos de TikTok',
  ): Promise<Buffer> {
    const processedVideos = videos.map((video) => {
      const engagementRate =
        video.view_count > 0
          ? ((video.like_count + video.comment_count + video.share_count) /
              video.view_count) *
            100
          : 0;

      return {
        title: video.title || 'Sin titulo',
        views: video.view_count,
        likes: video.like_count,
        shares: video.share_count,
        comments: video.comment_count,
        createdAt: new Date(video.create_time * 1000),
        duration: video.duration,
        shareUrl: video.share_url,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        id: video.id,
        userId: video.user.id,
        username: video.user.username,
      };
    });

    const sortedVideos = [...processedVideos].sort((a, b) => b.views - a.views);

    const totalViews = processedVideos.reduce(
      (sum, video) => sum + video.views,
      0,
    );
    const totalLikes = processedVideos.reduce(
      (sum, video) => sum + video.likes,
      0,
    );
    const totalShares = processedVideos.reduce(
      (sum, video) => sum + video.shares,
      0,
    );
    const totalComments = processedVideos.reduce(
      (sum, video) => sum + video.comments,
      0,
    );
    const totalDuration = processedVideos.reduce(
      (sum, video) => sum + video.duration,
      0,
    );
    const averageEngagementRate =
      processedVideos.reduce((sum, video) => sum + video.engagementRate, 0) /
      processedVideos.length;

    const userMetrics = users.map((user) => {
      const userVideos = processedVideos.filter((v) => v.userId === user.id);

      return {
        userId: user.id,
        username: user.username,
        videoCount: userVideos.length,
        totalViews: userVideos.reduce((sum, v) => sum + v.views, 0),
        totalLikes: userVideos.reduce((sum, v) => sum + v.likes, 0),
        totalShares: userVideos.reduce((sum, v) => sum + v.shares, 0),
        totalComments: userVideos.reduce((sum, v) => sum + v.comments, 0),
        averageEngagement:
          userVideos.length > 0
            ? userVideos.reduce((sum, v) => sum + v.engagementRate, 0) /
              userVideos.length
            : 0,
      };
    });

    const viewsChartBase64 =
      await this.chartService.generateViewsChart(sortedVideos);
    const engagementChartBase64 =
      await this.chartService.generateEngagementChart(sortedVideos);
    const likesComparisonBase64 =
      await this.chartService.generateLikesComparisonChart(sortedVideos);
    const engagementComparisonBase64 =
      await this.chartService.generateEngagementComparisonChart(sortedVideos);

    const userComparisonBase64 =
      await this.chartService.generateUserComparisonChart(userMetrics);

    const reportData: ReportData = {
      title: reportTitle,
      subtitle: reportSubtitle,
      date: new Date(),
      metrics: {
        totalViews,
        totalLikes,
        totalShares,
        totalComments,
        totalDuration,
        averageEngagementRate,
      },
      videos: processedVideos,
      users: userMetrics,
      charts: {
        viewsChartBase64,
        engagementChartBase64,
        likesComparisonBase64,
        engagementComparisonBase64,
        userComparisonBase64,
      },
    };

    if (format === ReportFormat.CSV) {
      return this.csvService.generateMultiUserReport(reportData);
    } else {
      return this.pdfService.generateMultiUserReport(reportData);
    }
  }
  
  async generateMultiUserInstagramReport(
    media: any[],
    users: (User & { social_medias: SocialMedia[] })[],
    format: ReportFormat = ReportFormat.PDF,
    reportTitle: string = 'Informe Instagram Multi-Usuario',
    reportSubtitle: string = 'Informe de rendimiento de publicaciones de Instagram',
  ): Promise<Buffer> {
    const processedMedia = media.map((item) => {
      const engagementRate = item.reach > 0
        ? ((item.likes + item.comments + item.saved + (item.shares || 0)) / item.reach) * 100
        : 0;
  
      return {
        id: item.id,
        title: item.caption || 'Sin descripción', // Usar "title" como en TikTok
        views: item.reach || 0, // Usar "views" como equivalente al "reach" de Instagram
        likes: item.likes || 0,
        shares: item.shares || 0,
        comments: item.comments || 0,
        saved: item.saved || 0, // Propiedad específica de Instagram
        createdAt: new Date(item.timestamp),
        shareUrl: item.permalink, // Usar "shareUrl" como en TikTok
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        userId: item.user.id,
        username: item.user.username,
        // Propiedades específicas de Instagram
        mediaType: item.media_type,
        mediaUrl: item.media_url,
        impressions: item.impressions || 0,
      };
    });
  
    const sortedMedia = [...processedMedia].sort((a, b) => b.views - a.views);
  
    const totalViews = processedMedia.reduce((sum, item) => sum + item.views, 0);
    const totalLikes = processedMedia.reduce((sum, item) => sum + item.likes, 0);
    const totalShares = processedMedia.reduce((sum, item) => sum + (item.shares || 0), 0);
    const totalComments = processedMedia.reduce((sum, item) => sum + item.comments, 0);
    const totalSaved = processedMedia.reduce((sum, item) => sum + (item.saved || 0), 0);
    const averageEngagementRate = processedMedia.length > 0
      ? processedMedia.reduce((sum, item) => sum + item.engagementRate, 0) / processedMedia.length
      : 0;
  
    const userMetrics = users.map((user) => {
      const userMedia = processedMedia.filter((m) => m.userId === user.id);
  
      return {
        userId: user.id,
        username: user.username,
        videoCount: userMedia.length,
        totalViews: userMedia.reduce((sum, m) => sum + m.views, 0),
        totalLikes: userMedia.reduce((sum, m) => sum + m.likes, 0),
        totalShares: userMedia.reduce((sum, m) => sum + (m.shares || 0), 0),
        totalComments: userMedia.reduce((sum, m) => sum + m.comments, 0),
        totalSaved: userMedia.reduce((sum, m) => sum + (m.saved || 0), 0), // Extra para Instagram
        averageEngagement: userMedia.length > 0
          ? userMedia.reduce((sum, m) => sum + m.engagementRate, 0) / userMedia.length
          : 0,
      };
    });
  
    const viewsChartBase64 = await this.chartService.generateViewsChart(sortedMedia);
    const engagementChartBase64 = await this.chartService.generateEngagementChart(sortedMedia);
    const likesComparisonBase64 = await this.chartService.generateLikesComparisonChart(sortedMedia);
    const engagementComparisonBase64 = await this.chartService.generateEngagementComparisonChart(sortedMedia);
    const userComparisonBase64 = await this.chartService.generateUserComparisonChart(userMetrics);
  
    const reportData: ReportData = {
      title: reportTitle,
      subtitle: reportSubtitle,
      date: new Date(),
      metrics: {
        totalViews,
        totalLikes,
        totalShares,
        totalComments,
        totalSaved, // Métrica específica de Instagram
        averageEngagementRate,
      },
      videos: processedMedia,
      users: userMetrics,
      charts: {
        viewsChartBase64,
        engagementChartBase64,
        likesComparisonBase64,
        engagementComparisonBase64,
        userComparisonBase64,
      },
      isInstagram: true,
    };
  
    if (format === ReportFormat.CSV) {
      return this.csvService.generateMultiUserReport(reportData);
    } else {
      return this.pdfService.generateMultiUserReport(reportData);
    }
  }
}
