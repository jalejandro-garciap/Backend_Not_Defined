import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TikTokVideoListResponse } from '../utils/interfaces/tiktok_video_list_response.interface';
import { catchError, firstValueFrom } from 'rxjs';
import { TikTokVideo } from '../utils/interfaces/tiktok_video.interface';
import { ReportService } from '../../../reports/services/report.service';

@Injectable()
export class TiktokService {
  constructor(
    @Inject() private readonly httpService: HttpService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
  ) {}

  async getTiktokVideos(
    accessToken: string,
    cursor: number,
  ): Promise<TikTokVideo[]> {
    const { data } = await firstValueFrom(
      this.httpService
        .post<TikTokVideoListResponse>(
          'https://open.tiktokapis.com/v2/video/list/',
          {
            cursor,
            max_count: 20,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              fields:
                'id,create_time,share_url,duration,title,like_count,comment_count,share_count,view_count',
            },
          },
        )
        .pipe(
          catchError((error) => {
            console.log(error.response.data);
            throw error.response.data;
          }),
        ),
    );
    return data.data.videos;
  }

  async generateTikTokReport(
    accessToken: string,
    cursor: number,
  ): Promise<Buffer> {
    return this.reportService.generateTikTokReport(accessToken, cursor);
  }
}