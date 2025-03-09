import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';

@Injectable()
export class YoutubeService {
    constructor(private readonly httpService: HttpService) {}

  async getYoutubeVideos(accessToken: string, pageToken?: string): Promise<any[]> {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const params = {
      part: 'snippet',
      maxResults: 20,
      forMine: 'true', 
      type: 'video',
      pageToken: pageToken || '',
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      }).pipe(
        catchError((error) => {
          console.error(error.response.data);
          throw error.response.data;
        }),
      ),
    );
    return data.items;
  }
}
