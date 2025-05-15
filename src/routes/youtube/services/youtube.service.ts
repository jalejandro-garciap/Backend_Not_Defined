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
    startDate?: string,
    endDate?: string,
    publishedAt?: string, // Fecha de publicación del video
  ): Promise<any> {
    // Si no se proporcionan fechas, usar valores por defecto
    const today = new Date().toISOString().split('T')[0];
    
    // Para la fecha de inicio, consideramos:
    // 1. La fecha proporcionada por el usuario
    // 2. La fecha de publicación del video
    // 3. 30 días atrás como último recurso
    
    let defaultStartDate;
    if (publishedAt) {
      // Si tenemos la fecha de publicación, usamos esa
      const pubDate = new Date(publishedAt);
      // Añadimos un día a la fecha de publicación (para asegurar que esté incluido)
      pubDate.setDate(pubDate.getDate() + 1);
      defaultStartDate = pubDate.toISOString().split('T')[0];
      
      console.log(`📅 Usando fecha basada en publicación para video de ${publishedAt}`);
    } else {
      // Caso por defecto: 30 días atrás
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    // Usar fechas proporcionadas o valores por defecto
    const useStartDate = startDate || defaultStartDate;
    const useEndDate = endDate || today;
    
    // Verificar si las fechas están en el futuro
    if (new Date(useEndDate) > new Date()) {
      console.warn('⚠️ Fecha final en el futuro, ajustando a hoy');
      endDate = today;
    } else {
      endDate = useEndDate;
    }
    
    // La fecha de inicio no puede ser futura
    if (new Date(useStartDate) > new Date()) {
      console.warn('⚠️ Fecha inicial en el futuro, ajustando a 30 días atrás');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    } else {
      startDate = useStartDate;
    }
    
    // Para videos muy antiguos, consultar un periodo razonable
    const MAX_DATE_RANGE_DAYS = 90; // YouTube puede limitar consultas con rangos muy amplios
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Calcular la diferencia en días
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      console.warn(`⚠️ El rango de fechas es muy amplio (${diffDays} días). Limitando a ${MAX_DATE_RANGE_DAYS} días desde la fecha final.`);
      // Ajustar la fecha de inicio para mantenerla dentro del límite
      startDateObj.setTime(endDateObj.getTime() - (MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000));
      startDate = startDateObj.toISOString().split('T')[0];
    }
    
    console.log(`📅 Fechas finales para analytics: ${startDate} a ${endDate} (${diffDays} días)`);
    
    const url = 'https://youtubeanalytics.googleapis.com/v2/reports';
    const params = {
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,comments,likes,dislikes,estimatedMinutesWatched,averageViewDuration,shares,subscribersGained,subscribersLost',
      dimensions: 'video',
      filters: `video==${videoId}`,
    };

    console.log('⚠️ Intentando obtener datos de YouTube Analytics - asegúrate de tener habilitado YouTube Analytics API en la consola de Google Cloud.');
    console.log('📊 URL de YouTube Analytics:', url);
    console.log('🔑 Parámetros:', JSON.stringify(params));
    console.log('🎥 Video ID:', videoId);

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params,
          })
          .pipe(
            catchError((error) => {
              console.error('❌ Error fetching video analytics:', error.response?.data || error);
              // En lugar de lanzar una excepción, devolvemos un Observable que emitirá un objeto vacío
              return throwError(() => ({ data: { rows: [] } }));
            }),
          ),
      );

      // Si no hay datos para ese video, intentar una consulta general del canal
      if (!data || !data.rows || data.rows.length === 0) {
        console.warn(`⚠️ No hay datos específicos para el video ${videoId}. Intentando obtener datos generales del canal.`);
        
        const channelParams = {
          ids: 'channel==MINE',
          startDate,
          endDate,
          metrics: 'views,comments,likes,dislikes,estimatedMinutesWatched,averageViewDuration,shares,subscribersGained,subscribersLost',
        };
        
        try {
          const channelData = await firstValueFrom(
            this.httpService
              .get(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: channelParams,
              })
              .pipe(
                catchError((error) => {
                  console.error('❌ Error fetching channel analytics:', error.response?.data || error);
                  return throwError(() => ({ data: { rows: [] } }));
                }),
              ),
          );
          
          if (channelData && channelData.data && channelData.data.rows && channelData.data.rows.length > 0) {
            const analyticsData = {};
            channelData.data.columnHeaders.forEach((header, index) => {
              analyticsData[header.name] = channelData.data.rows[0][index];
            });
            console.log('✅ Usando datos generales del canal para este video');
            return analyticsData;
          }
        } catch (error) {
          console.error('❌ Error al obtener datos generales del canal:', error);
        }
        
        return {};
      }

      // Process the analytics data
      if (data && data.rows && data.rows.length > 0) {
        const analyticsData = {};
        data.columnHeaders.forEach((header, index) => {
          analyticsData[header.name] = data.rows[0][index];
        });

        console.log('✅ Datos de YouTube Analytics obtenidos correctamente para el video');
        return analyticsData;
      }

      console.warn('⚠️ No se encontraron datos de YouTube Analytics para este video');
      return {};
    } catch (error) {
      console.error('❌ Failed to get video analytics:', error);
      // Devolver un objeto vacío en lugar de permitir que el error se propague
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

    // 2. Obtener todos los videos del canal
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

    // 3. Obtener detalles de los videos en lotes de 50
    const videosDetails: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batchIds = videoIds.slice(i, i + 50);
      const details = await this.getVideosDetails(accessToken, batchIds);
      videosDetails.push(...details);
    }

    // 4. Obtener datos del canal (para el número de suscriptores)
    const subscribersCount = channelData?.statistics?.subscriberCount
      ? Number(channelData.statistics.subscriberCount)
      : 0;

    // 5. Preparar las fechas para Analytics (dejaremos que getVideoAnalytics maneje la validación)
    const startDate = publishedAfter || undefined;
    const endDate = publishedBefore || undefined;
    
    console.log(`⏱️ Fechas para consultas de analytics: ${startDate || 'no especificada'} a ${endDate || 'no especificada'}`);

    // 6. Consolidar la información en base a la interfaz YoutubeVideoMetrics
    let metrics: YoutubeVideoMetrics[] = [];
    let analyticsAccessible = true;
    
    for (const video of videosDetails) {
      const snippet = video.snippet;
      const statistics = video.statistics;
      
      // 7. Obtener datos de analytics para cada video
      let analyticsData: {
        shares?: number;
        estimatedMinutesWatched?: number;
        averageViewDuration?: number;
        annotationClickThroughRate?: number;
        annotationCloseRate?: number;
        dislikes?: number;
        estimatedRevenue?: number;
        subscribersGained?: number;
        subscribersLost?: number;
      } = {};
      
      if (analyticsAccessible) {
        try {
          analyticsData = await this.getVideoAnalytics(
            accessToken,
            video.id,
            startDate,
            endDate,
            snippet?.publishedAt
          );
          
          // Si no hay datos de analytics y es el primer video, probablemente no tengamos acceso
          if (Object.keys(analyticsData).length === 0 && metrics.length === 0) {
            console.warn('⚠️ No se pudo acceder a YouTube Analytics. Continuando solo con datos de la API de YouTube Data.');
            analyticsAccessible = false;
          }
        } catch (error) {
          analyticsAccessible = false;
          console.error('❌ Error al obtener datos de YouTube Analytics:', error);
        }
      }

      // 8. Consolida información básica del video
      const viewCount = Number(statistics?.viewCount) || 0;
      const likes = Number(statistics?.likeCount) || 0;
      const comments = Number(statistics?.commentCount) || 0;
      
      // 9. Usa datos de analytics cuando estén disponibles
      const shares = analyticsData.shares || 0;
      const saved = 0; // No disponible en YouTube
      const viewing_time_total = analyticsData.estimatedMinutesWatched || null;
      const viewing_time_avg = analyticsData.averageViewDuration || null;

      // 10. Calcular métricas derivadas
      const reach = viewCount; // Usando vistas como aproximación del alcance
      const impressions = null; // No disponible directamente
      const engagement = likes + comments + shares + saved;
      const engagement_rate = reach > 0 ? engagement / reach : 0;

      // 11. Construir el objeto de métricas
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
        viewerPercentage: null // Ya no obtenemos este dato
      });
    }

    // 12. Aplicar filtro de hashtags si corresponde
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
