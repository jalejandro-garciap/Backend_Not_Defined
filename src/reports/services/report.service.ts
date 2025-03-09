import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { TiktokService } from '../../routes/tiktok/services/tiktok.service';
import { ReportData } from '../interfaces/report-data.interfaces';

@Injectable()
export class ReportService {
  constructor(
    private readonly pdfService: PdfService,
    @Inject(forwardRef(() => TiktokService))
    private readonly tiktokService: TiktokService,
  ) {}

  async generateTikTokReport(
    accessToken: string,
    cursor: number,
  ): Promise<Buffer> {
    const videos = await this.tiktokService.getTiktokVideos(
      accessToken,
      cursor,
    );

    const reportData: ReportData = {
      title: 'Informe de Rendimiento de TikTok',
      date: new Date(),
      metrics: {
        totalViews: videos.reduce((sum, video) => sum + video.view_count, 0),
        totalLikes: videos.reduce((sum, video) => sum + video.like_count, 0),
        totalShares: videos.reduce((sum, video) => sum + video.share_count, 0),
        totalComments: videos.reduce(
          (sum, video) => sum + video.comment_count,
          0,
        ),
      },
      videos: videos.map((video) => ({
        title: video.title,
        views: video.view_count,
        likes: video.like_count,
        shares: video.share_count,
        comments: video.comment_count,
        createdAt: new Date(video.create_time),
      })),
    };

    return this.pdfService.generateReport(reportData);
  }
}