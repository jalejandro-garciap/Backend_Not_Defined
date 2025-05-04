import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { TikTokVideoListResponse } from '../utils/interfaces/tiktok_video_list_response.interface';
import { catchError, firstValueFrom } from 'rxjs';
import { TikTokVideo } from '../utils/interfaces/tiktok_video.interface';

@Injectable()
export class TiktokService {
  constructor(@Inject() private readonly httpService: HttpService) {}

  async getAllTiktokVideos(
    accessToken: string,
    dateRange?: { startDate?: Date; endDate?: Date },
    hashtags?: string[],
    maxPages: number = 5,
  ): Promise<TikTokVideo[]> {
    const allVideos: TikTokVideo[] = [];
    let currentCursor = 0;
    let hasMore = true;
    let pageCount = 0;

    let foundVideosInRange = false;
    let consecutivePagesWithNoMatchingVideos = 0;
    const MAX_PAGES_WITHOUT_MATCHES = 2;

    const normalizedHashtags =
      hashtags?.map((tag) =>
        tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`,
      ) || [];
    const applyHashtagFilter = dateRange && normalizedHashtags.length > 0;

    while (hasMore && pageCount < maxPages) {
      try {
        const { data } = await firstValueFrom(
          this.httpService
            .post<TikTokVideoListResponse>(
              'https://open.tiktokapis.com/v2/video/list/',
              {
                cursor: currentCursor,
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
                throw error.response?.data || error;
              }),
            ),
        );

        if (!data.data.videos || data.data.videos.length === 0) {
          break;
        }

        let videosInRangeInThisPage = 0;
        const videosToAdd: TikTokVideo[] = [];

        data.data.videos.forEach((video) => {
          let isInDateRange = true;
          if (dateRange && (dateRange.startDate || dateRange.endDate)) {
            const videoDate = new Date(video.create_time * 1000);
            const year = videoDate.getFullYear();
            const month = videoDate.getMonth();
            const day = videoDate.getDate();
            const normalizedVideoDate = new Date(Date.UTC(year, month, day));

            if (
              dateRange.startDate &&
              normalizedVideoDate < dateRange.startDate
            ) {
              isInDateRange = false;
            }
            if (isInDateRange && dateRange.endDate) {
              const adjustedEndDate = new Date(dateRange.endDate);
              adjustedEndDate.setHours(23, 59, 59, 999);
              if (normalizedVideoDate > adjustedEndDate) {
                isInDateRange = false;
              }
            }
          }

          let hasMatchingHashtag = !applyHashtagFilter;
          if (applyHashtagFilter && isInDateRange) {
            const videoTitleLower = video.title?.toLowerCase() || '';
            hasMatchingHashtag = normalizedHashtags.some((tag) =>
              videoTitleLower.includes(tag),
            );
          }

          if (isInDateRange && hasMatchingHashtag) {
            videosInRangeInThisPage++;
            videosToAdd.push(video);
          }
        });

        allVideos.push(...videosToAdd);

        if (dateRange) {
          if (videosInRangeInThisPage === 0) {
            consecutivePagesWithNoMatchingVideos++;
          } else {
            foundVideosInRange = true;
            consecutivePagesWithNoMatchingVideos = 0;
          }

          if (
            foundVideosInRange &&
            consecutivePagesWithNoMatchingVideos >= MAX_PAGES_WITHOUT_MATCHES
          ) {
            break;
          }
        }

        currentCursor = parseInt(data.data.cursor, 10);
        hasMore = data.data.has_more && currentCursor > 0;
        pageCount++;
      } catch (error) {
        console.error('Error al procesar la paginación:', error);
        break;
      }
    }

    return allVideos;
  }
}
