import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class InstagramService {
  constructor(private readonly httpService: HttpService) {}

  private async requestMediaInsights(
    mediaId: string,
    accessToken: string,
    metrics: string[],
  ): Promise<any[]> {
    const url = `https://graph.instagram.com/${mediaId}/insights`;
    const params = {
      metric: metrics.join(','),
      access_token: accessToken,
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, { params }).pipe(
        catchError((error) => {
          throw error.response.data;
        }),
      ),
    );
    return data.data;
  }

  async getMediaInsights(mediaId: string, accessToken: string): Promise<any[]> {
    const fullMetrics = [
      'likes',
      'comments',
      'saved',
      'shares',
      'reach',
      'impressions',
    ];

    try {
      return await this.requestMediaInsights(mediaId, accessToken, fullMetrics);
    } catch (error) {
      if (
        error.error &&
        error.error.message &&
        error.error.message.includes('impressions')
      ) {
        const reducedMetrics = fullMetrics.filter((m) => m !== 'impressions');
        return await this.requestMediaInsights(
          mediaId,
          accessToken,
          reducedMetrics,
        );
      }
      throw error;
    }
  }

  async getUserData(accessToken: string): Promise<any> {
    const url = `https://graph.instagram.com/me`;
    const params = {
      fields: 'id,username,followers_count',
      access_token: accessToken,
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, { params }).pipe(
        catchError((error) => {
          console.error('Error getting user data:', error.response.data);
          throw error.response.data;
        }),
      ),
    );
    return data;
  }

  async getUserMedia(accessToken: string): Promise<any[]> {
    const url = `https://graph.instagram.com/me/media`;
    const params = {
      fields: 'id,permalink,media_type,timestamp',
      access_token: accessToken,
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, { params }).pipe(
        catchError((error) => {
          console.error('Error getting media list:', error.response.data);
          throw error.response.data;
        }),
      ),
    );
    return data.data;
  }

  async getUserMediaWithDateFilter(
    accessToken: string,
    dateRange?: { startDate?: Date; endDate?: Date },
    hashtags?: string[], // Add hashtags parameter
  ): Promise<any[]> {
    const url = `https://graph.instagram.com/me/media`;
    const params: {
      fields: string;
      access_token: string;
      limit: number;
      after?: string;
    } = {
      fields:
        'id,caption,permalink,media_type,timestamp,media_url,thumbnail_url',
      access_token: accessToken,
      limit: 100,
    };

    let allMedia: any[] = [];
    let nextUrl = url;
    let hasNextPage = true;

    while (hasNextPage) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.get(nextUrl, { params }).pipe(
            catchError((error) => {
              console.error(
                'Error getting media list:',
                error.response?.data || error.message,
              );
              throw error.response?.data || error;
            }),
          ),
        );

        allMedia = [...allMedia, ...data.data];

        if (data.paging && data.paging.next) {
          nextUrl = data.paging.next;
          params.after = data.paging.cursors.after;
        } else {
          hasNextPage = false;
        }

        if (allMedia.length >= 100) {
          hasNextPage = false;
        }
      } catch (error) {
        console.error('Error en paginación de Instagram:', error);
        break;
      }
    }

    let filteredMedia = allMedia;

    // 1. Filter by Date Range
    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      filteredMedia = filteredMedia.filter((media) => {
        const mediaDate = new Date(media.timestamp);
        let isInRange = true;
        // Normalize media date to UTC day start
        const normalizedMediaDate = this.normalizeToUTCDay(mediaDate);

        if (dateRange.startDate) {
          const startDate = this.normalizeToUTCDay(dateRange.startDate);
          if (normalizedMediaDate < startDate) {
            isInRange = false;
          }
        }

        if (isInRange && dateRange.endDate) {
          // Normalize end date to UTC day end for inclusive check
          const endDate = this.normalizeToUTCDay(dateRange.endDate, true);
          if (normalizedMediaDate > endDate) {
            isInRange = false;
          }
        }
        return isInRange;
      });
    }

    // 2. Filter by Hashtags (only if dateRange was provided)
    if (dateRange && hashtags && hashtags.length > 0) {
      const normalizedHashtags = hashtags.map((tag) =>
        tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`,
      );
      filteredMedia = filteredMedia.filter((media) => {
        const captionLower = media.caption?.toLowerCase() || '';
        return normalizedHashtags.some((tag) => captionLower.includes(tag));
      });
    }

    return filteredMedia;
  }

  private normalizeToUTCDay(date: Date, isEndDate: boolean = false): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const normalized = new Date(Date.UTC(year, month, day));

    if (isEndDate) {
      normalized.setUTCHours(23, 59, 59, 999);
    } else {
      normalized.setUTCHours(0, 0, 0, 0);
    }

    return normalized;
  }

  async getCommentsCount(
    mediaId: string,
    accessToken: string,
  ): Promise<number> {
    const url = `https://graph.instagram.com/${mediaId}/comments`;
    const params = {
      access_token: accessToken,
      summary: true,
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, { params }).pipe(
        catchError((error) => {
          console.error(
            `Error getting comments for media ${mediaId}:`,
            error.response.data,
          );
          throw error.response.data;
        }),
      ),
    );
    return data.summary?.total_count || 0;
  }

  async getAllPostsMetricsWithDateFilter(
    accessToken: string,
    dateRange?: { startDate?: Date; endDate?: Date },
    hashtags?: string[],
  ): Promise<any[]> {
    const userData = await this.getUserData(accessToken);
    const mediaItems = await this.getUserMediaWithDateFilter(
      accessToken,
      dateRange,
      hashtags,
    );

    if (mediaItems.length === 0) {
      return [];
    }

    const postsMetrics = [];

    for (const media of mediaItems) {
      try {
        const insights = await this.getMediaInsights(media.id, accessToken);
        const commentsCount = await this.getCommentsCount(
          media.id,
          accessToken,
        );

        const metrics = insights.reduce(
          (acc, metric) => {
            acc[metric.name] = metric.values[0]?.value;
            return acc;
          },
          {} as Record<string, number>,
        );

        const engagement =
          (metrics.likes || 0) +
          (metrics.comments || 0) +
          (metrics.saved || 0) +
          (metrics.shares || 0);
        const engagementRate =
          metrics.reach > 0 ? engagement / metrics.reach : 0;

        postsMetrics.push({
          id: media.id,
          creator: userData.username,
          social_media: 'instagram',
          permalink: media.permalink,
          media_type: media.media_type,
          timestamp: media.timestamp,
          media_url: media.media_url || media.thumbnail_url,
          caption: media.caption || 'Sin descripción',
          followers_count: userData.followers_count || 0,
          video_views: media.views,
          reach: metrics.reach || 0,
          impressions: metrics.impressions || null,
          likes: metrics.likes || 0,
          comments: metrics.comments || 0 || commentsCount,
          shares: metrics.shares || 0,
          saved: metrics.saved || 0,
          viewing_time: null,
          engagement: engagement,
          engagement_rate: engagementRate,
        });
      } catch (error) {
        console.error(
          `Error obteniendo métricas para media ${media.id}:`,
          error,
        );
      }
    }

    return postsMetrics;
  }
}
