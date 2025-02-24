import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { TikTokVideoListResponse } from '../utils/interfaces/tiktok_video_list_response.interface';
import { catchError, firstValueFrom } from 'rxjs';
import { User } from '@prisma/client';
import { TikTokVideo } from '../utils/interfaces/tiktok_video.interface';

@Injectable()
export class TiktokService {
  constructor(@Inject() private readonly httpService: HttpService) {}

  async getTiktokVideos(accessToken: string): Promise<TikTokVideo[]> {
    const { data } = await firstValueFrom(
      this.httpService
        .post<TikTokVideoListResponse>(
          'https://open.tiktokapis.com/v2/video/list/',
          {
            cursor: 0,
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
}
