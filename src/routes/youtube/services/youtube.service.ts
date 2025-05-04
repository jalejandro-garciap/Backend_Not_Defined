import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';
import { YoutubeVideoMetrics } from '../utils/interfaces/youtube_metrics.interface';

@Injectable()
export class YoutubeService {
  constructor(private readonly httpService: HttpService) {}

  // 1. Obtiene la lista de videos del canal autenticado usando channelId y fechas
  async getYoutubeVideos(
    accessToken: string,
    channelId: string,
    pageToken?: string,
    publishedAfter?: string,
    publishedBefore?: string,
  ): Promise<{ items: any[]; nextPageToken?: string }> {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const params: any = {
      part: 'snippet',
      maxResults: 20,
      channelId,
      type: 'video',
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (publishedAfter && publishedBefore) {
      params.publishedAfter = publishedAfter;
      params.publishedBefore = publishedBefore;
    }

    const { data } = await firstValueFrom(
      this.httpService
        .get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params,
        })
        .pipe(
          catchError((error) => {
            console.error(
              'Error fetching YouTube videos:',
              error.response?.data || error,
            );
            throw error.response?.data || error;
          }),
        ),
    );
    return { items: data.items, nextPageToken: data.nextPageToken };
  }

  // 2. Obtiene detalles (snippet y statistics) de videos mediante sus IDs
  async getVideosDetails(
    accessToken: string,
    videoIds: string[],
  ): Promise<any[]> {
    if (!videoIds.length) return [];
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const params = {
      part: 'snippet,statistics',
      id: videoIds.join(','),
    };

    const { data } = await firstValueFrom(
      this.httpService
        .get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params,
        })
        .pipe(
          catchError((error) => {
            console.error('Error fetching video details:', error.response.data);
            throw error.response.data;
          }),
        ),
    );
    return data.items;
  }

  // 3. Obtiene datos del canal para extraer el número de suscriptores
  async getChannelData(accessToken: string, channelId: string): Promise<any> {
    const url = 'https://www.googleapis.com/youtube/v3/channels';
    const params: {
      part: string;
      id?: string;
      mine?: boolean;
    } = {
      part: 'statistics',
    };

    if (channelId) {
      params.id = channelId;
    } else {
      params.mine = true; // Si no se pasa channelId, obtener el canal del usuario autenticado
    }

    const { data } = await firstValueFrom(
      this.httpService
        .get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params,
        })
        .pipe(
          catchError((error) => {
            console.error('Error fetching channel data:', error.response.data);
            throw error.response.data;
          }),
        ),
    );
    return data.items && data.items.length > 0 ? data.items[0] : null;
  }

  // Función auxiliar para extraer hashtags de un texto (devuelve una cadena con los hashtags separados por espacio)
  private extractHashtags(text: string): string {
    if (!text) return '';
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.join(' ') : '';
  }

  // 4. Función consolidada que obtiene las métricas de todos los videos (todas las páginas)
  async getAllVideoMetrics(
    accessToken: string,
    publishedAfter?: string, // Represents dateRange start
    publishedBefore?: string, // Represents dateRange end
    hashtags?: string[], // Add hashtags parameter
  ): Promise<YoutubeVideoMetrics[]> {
    // 1. Obtener el channelId del usuario autenticado
    const channelData = await this.getChannelData(accessToken, '');
    if (!channelData || !channelData.id) {
      throw new Error('No se pudo obtener el channelId del usuario');
    }
    const channelId = channelData.id;

    let allVideos: any[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const { items, nextPageToken } = await this.getYoutubeVideos(
        accessToken,
        channelId,
        pageToken,
        publishedAfter, // Pass date range filters
        publishedBefore,
      );
      allVideos = allVideos.concat(items);
      pageToken = nextPageToken;
    } while (pageToken);

    const videoIds = allVideos.map((video) => video.id.videoId).filter(Boolean);
    if (!videoIds.length) return [];

    // Procesar los IDs en lotes de 50
    const videosDetails: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batchIds = videoIds.slice(i, i + 50);
      const details = await this.getVideosDetails(accessToken, batchIds);
      videosDetails.push(...details);
    }

    // d) Obtener datos del canal (para el número de suscriptores)
    const subscribersCount = channelData?.statistics?.subscriberCount
      ? Number(channelData.statistics.subscriberCount)
      : 0;

    // e) Consolidar la información en base a la interfaz YoutubeVideoMetrics
    let metrics: YoutubeVideoMetrics[] = videosDetails.map((video) => {
      const snippet = video.snippet;
      const statistics = video.statistics;

      const viewCount = Number(statistics?.viewCount) || 0;
      const likes = Number(statistics?.likeCount) || 0;
      const comments = Number(statistics?.commentCount) || 0;
      // YouTube Data API v3 doesn't provide shares, saved, or viewing time directly
      const shares = 0;
      const saved = 0;
      const viewing_time_total = null;
      const viewing_time_avg = null;

      // Approximations
      const reach = viewCount; // Using views as reach approximation
      const impressions = null; // Not available
      const engagement = likes + comments + shares + saved;
      const engagement_rate = reach > 0 ? engagement / reach : 0;

      return {
        creator: snippet?.channelTitle || 'Unknown',
        title: snippet?.title || 'No Title',
        social_media: 'youtube',
        permalink: `https://www.youtube.com/watch?v=${video.id}`,
        description: snippet?.description || '',
        followers_count: subscribersCount,
        video_views: viewCount,
        reach: reach,
        impressions: impressions,
        likes: likes,
        comments: comments,
        shares: shares,
        saved: saved,
        viewing_time_total: viewing_time_total,
        viewing_time_avg: viewing_time_avg,
        engagement: engagement,
        engagement_rate: engagement_rate,
        createdAt: snippet?.publishedAt
          ? new Date(snippet.publishedAt)
          : new Date(),
        tags: snippet?.tags || [],
      };
    });

    const applyHashtagFilter =
      (publishedAfter || publishedBefore) && hashtags && hashtags.length > 0;
    if (applyHashtagFilter) {
      const normalizedHashtags = hashtags.map((tag) =>
        tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`,
      );
      metrics = metrics.filter((metric) => {
        const descriptionLower = metric.description.toLowerCase();
        const titleLower = metric.title.toLowerCase();
        return normalizedHashtags.some(
          (tag) => descriptionLower.includes(tag) || titleLower.includes(tag),
        );
      });
    }

    return metrics;
  }
}
