import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';
import { InstagramMetrics } from '../utils/interfaces/instagram_metrics.interface';

@Injectable()
export class InstagramService {
  constructor(private readonly httpService: HttpService) {}

  private async requestMediaInsights(mediaId: string, accessToken: string, metrics: string[]): Promise<any[]> {
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
    
    const fullMetrics = ['likes', 'comments', 'saved', 'shares', 'reach', 'impressions'];

    try {
      return await this.requestMediaInsights(mediaId, accessToken, fullMetrics);
    } catch (error) {
      if (error.error && error.error.message && error.error.message.includes('impressions')) {
        const reducedMetrics = fullMetrics.filter((m) => m !== 'impressions');
        return await this.requestMediaInsights(mediaId, accessToken, reducedMetrics);
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

  async getCommentsCount(mediaId: string, accessToken: string): Promise<number> {
    const url = `https://graph.instagram.com/${mediaId}/comments`;
    const params = {
      access_token: accessToken,
      summary: true,
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, { params }).pipe(
        catchError((error) => {
          console.error(`Error getting comments for media ${mediaId}:`, error.response.data);
          throw error.response.data;
        }),
      ),
    );
    return data.summary?.total_count || 0;
  }


  private extractHashtags(caption: string): string[] {
    if (!caption) return [];
    const regex = /#(\w+)/g;
    const matches = caption.match(regex);
    return matches || [];
  }

  async getAllPostsMetrics(accessToken: string): Promise<InstagramMetrics[]> {

    const userData = await this.getUserData(accessToken);
    const mediaItems = await this.getUserMedia(accessToken);
    
    const InstagramMetrics = [];

    for (const media of mediaItems) {

      const insights = await this.getMediaInsights(media.id, accessToken);
      const commentsCount = await this.getCommentsCount(media.id, accessToken);

      const metrics = insights.reduce((acc, metric) => {
        acc[metric.name] = metric.values[0]?.value;
        return acc;
      }, {} as Record<string, number>);

      const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.saved || 0) + (metrics.shares || 0);
      const engagementRate = metrics.reach > 0 ? engagement / metrics.reach : 0;

      InstagramMetrics.push({
        creator: userData.username,                         // Creador
        social_media: 'instagram',                          // Red Social
        permalink: media.permalink,                         // Link a la publicación
        description: media.caption || "",                            // Hashtags extraídos del caption
        followers_count: userData.followers_count || 0,     // No. de Seguidores
        video_views: metrics.video_views || null,           // Reproducciones
        reach: metrics.reach || 0,                          // Alcance (personas diferentes)
        impressions: metrics.impressions || null,           // Impresiones (null si no aplica)
        likes: metrics.likes || 0,                          // Likes
        comments: metrics.comments || commentsCount,        // Comentarios
        shares: metrics.shares || 0,                         // Shares
        saved: metrics.saved || 0,                          // Guardados
        viewing_time_total: metrics.ig_reels_video_view_total_time || null,
        viewing_time_avg: metrics.ig_reels_avg_watch_time || null,
        engagement: engagement,                             // Engagement total
        engagement_rate: engagementRate,                    // ER = engagement / reach
      });
    }

    return InstagramMetrics;
  }
}
