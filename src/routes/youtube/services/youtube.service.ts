import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, catchError, throwError } from 'rxjs';
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

  // 4. Obtiene datos de YouTube Analytics API para un video específico
  async getVideoAnalytics(
    accessToken: string,
    videoId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const url = 'https://youtubeanalytics.googleapis.com/v2/reports';
    const params = {
      dimensions: 'video',
      endDate,
      ids: 'channel==MINE',
      metrics: 'annotationClickThroughRate,annotationCloseRate,averageViewDuration,comments,dislikes,estimatedMinutesWatched,estimatedRevenue,likes,shares,subscribersGained,subscribersLost,views',
      filters: `video==${videoId}`,
      startDate,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params,
          })
          .pipe(
            catchError((error) => {
              console.error('Error fetching video analytics:', error.response?.data || error);
              throw error.response?.data || error;
            }),
          ),
      );

      // Get viewer demographics data
      const demographicsData = await this.getViewerDemographics(
        accessToken,
        videoId,
        startDate,
        endDate,
      );

      // Process the analytics data
      if (data.rows && data.rows.length > 0) {
        const analyticsData = {};
        data.columnHeaders.forEach((header, index) => {
          analyticsData[header.name] = data.rows[0][index];
        });

        return {
          ...analyticsData,
          viewerPercentage: demographicsData,
        };
      }

      return {
        viewerPercentage: demographicsData,
      };
    } catch (error) {
      console.error('Failed to get video analytics:', error);
      return {};
    }
  }

  // 5. Obtiene datos demográficos de los espectadores
  async getViewerDemographics(
    accessToken: string,
    videoId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const url = 'https://youtubeanalytics.googleapis.com/v2/reports';
    const params = {
      dimensions: 'ageGroup,gender',
      endDate,
      ids: 'channel==MINE',
      metrics: 'viewerPercentage',
      filters: `video==${videoId}`,
      startDate,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params,
          })
          .pipe(
            catchError((error) => {
              console.error('Error fetching viewer demographics:', error.response?.data || error);
              return throwError(() => new Error('Failed to fetch viewer demographics'));
            }),
          ),
      );

      if (data.rows && data.rows.length > 0) {
        // Transform the demographics data into a more usable format
        const demographics = {};
        data.rows.forEach((row) => {
          const ageGroup = row[0];
          const gender = row[1];
          const percentage = row[2];
          
          if (!demographics[gender]) {
            demographics[gender] = {};
          }
          demographics[gender][ageGroup] = percentage;
        });
        
        return demographics;
      }
      
      return {};
    } catch (error) {
      console.error('Failed to get viewer demographics:', error);
      return {};
    }
  }

  // Función auxiliar para extraer hashtags de un texto (devuelve una cadena con los hashtags separados por espacio)
  private extractHashtags(text: string): string {
    if (!text) return '';
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.join(' ') : '';
  }

  // 6. Función consolidada que obtiene las métricas de todos los videos (todas las páginas)
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

    // Define the date range for analytics
    const startDate = publishedAfter 
      ? new Date(publishedAfter).toISOString().split('T')[0] 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default to last 30 days
    
    const endDate = publishedBefore 
      ? new Date(publishedBefore).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]; // Today

    // e) Consolidar la información en base a la interfaz YoutubeVideoMetrics
    let metrics: YoutubeVideoMetrics[] = [];
    
    for (const video of videosDetails) {
      const snippet = video.snippet;
      const statistics = video.statistics;
      
      // Get analytics data for this video
      const analyticsData = await this.getVideoAnalytics(
        accessToken,
        video.id,
        startDate,
        endDate,
      );

      const viewCount = Number(statistics?.viewCount) || 0;
      const likes = Number(statistics?.likeCount) || 0;
      const comments = Number(statistics?.commentCount) || 0;
      
      // Use analytics data when available, fallback to approximations
      const shares = analyticsData.shares || 0;
      const saved = 0; // Not available
      const viewing_time_total = analyticsData.estimatedMinutesWatched || null;
      const viewing_time_avg = analyticsData.averageViewDuration || null;

      // Approximations
      const reach = viewCount; // Using views as reach approximation
      const impressions = null; // Not available
      const engagement = likes + comments + shares + saved;
      const engagement_rate = reach > 0 ? engagement / reach : 0;

      metrics.push({
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
        
        // YouTube Analytics API fields
        annotationClickThroughRate: analyticsData.annotationClickThroughRate || null,
        annotationCloseRate: analyticsData.annotationCloseRate || null,
        averageViewDuration: analyticsData.averageViewDuration || null,
        dislikes: analyticsData.dislikes || null,
        estimatedMinutesWatched: analyticsData.estimatedMinutesWatched || null,
        estimatedRevenue: analyticsData.estimatedRevenue || null,
        subscribersGained: analyticsData.subscribersGained || null,
        subscribersLost: analyticsData.subscribersLost || null,
        viewerPercentage: analyticsData.viewerPercentage || null,
      });
    }

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
