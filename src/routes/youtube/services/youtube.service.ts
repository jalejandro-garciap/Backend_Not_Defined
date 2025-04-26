import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';
import { YoutubeVideoMetrics } from '../utils/interfaces/youtube_metrics.interface';

@Injectable()
export class YoutubeService {
  constructor(private readonly httpService: HttpService) {}

  // 1. Obtiene la lista de videos del canal autenticado
  async getYoutubeVideos(
    accessToken: string,
    pageToken?: string,
    publishedAfter?: string,
    publishedBefore?: string,
  ): Promise<any[]> {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const params = {
      part: 'snippet',
      maxResults: 20,
      forMine: 'true',
      type: 'video',
      pageToken: pageToken || '',
      publishedAfter: publishedAfter || '',
      publishedBefore: publishedBefore || '',
    };

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
              error.response.data,
            );
            throw error.response.data;
          }),
        ),
    );
    return data.items;
  }

  // 2. Obtiene detalles (snippet y statistics) de videos mediante sus IDs
  async getVideosDetails(
    accessToken: string,
    videoIds: string[],
  ): Promise<any[]> {
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
    const params = {
      part: 'statistics',
      id: channelId,
    };

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

  // 4. Función consolidada que obtiene las métricas de todos los videos
  async getAllVideoMetrics(
    accessToken: string,
    pageToken?: string,
    publishedAfter?: string,
    publishedBefore?: string,
  ): Promise<YoutubeVideoMetrics[]> {
    // a) Obtener videos mediante el endpoint de búsqueda
    const videos = await this.getYoutubeVideos(
      accessToken,
      pageToken,
      publishedAfter,
      publishedBefore,
    );
    const videoIds = videos.map((video) => video.id.videoId);

    // b) Obtener detalles de los videos (snippet y statistics)
    const videosDetails = await this.getVideosDetails(accessToken, videoIds);

    // c) Suponiendo que todos los videos provienen del mismo canal, se obtiene el channelId del primer video
    let channelId = '';
    if (videosDetails.length > 0) {
      channelId = videosDetails[0].snippet.channelId;
    }
    // d) Obtener datos del canal (para el número de suscriptores)
    const channelData = await this.getChannelData(accessToken, channelId);
    const subscribersCount =
      channelData &&
      channelData.statistics &&
      channelData.statistics.subscriberCount
        ? Number(channelData.statistics.subscriberCount)
        : 0;

    // e) Consolidar la información en base a la interfaz YoutubeVideoMetrics
    const metrics: YoutubeVideoMetrics[] = videosDetails.map((video) => {
      const snippet = video.snippet;
      const statistics = video.statistics;

      const viewCount = Number(statistics.viewCount) || 0;
      const likes = Number(statistics.likeCount) || 0;
      const comments = Number(statistics.commentCount) || 0;
      // Los siguientes datos no están disponibles en la Data API v3
      const shares = 0;
      const saved = 0;
      const viewing_time_total = null;
      const viewing_time_avg = null;

      // Se usará viewCount como aproximación de reach
      const reach = viewCount;
      const impressions = null;
      const engagement = likes + comments + shares + saved;
      const engagement_rate = reach > 0 ? engagement / reach : 0;

      return {
        creator: snippet.channelTitle,
        social_media: 'youtube',
        permalink: `https://www.youtube.com/watch?v=${video.id}`,
        description: snippet.description || '',
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
        createdAt: new Date(snippet.publishedAt),
      };
    });

    return metrics;
  }
}
