export interface YoutubeVideoMetrics {
  creator: string;                   // Nombre de usuario o canal\
  title: string;                     // Título del video
  social_media: string;              // 'youtube'
  permalink: string;                 // Enlace a la publicación (video)
  description: string;               // Texto del description del video (o hashtags extraídos)
  followers_count: number;           // Número de suscriptores (se obtiene vía otro endpoint)
  video_views: number | null;        // Reproducciones (viewCount)
  reach: number;                     // Alcance (no disponible, se dejará en 0 o se podría aproximar a video_views)
  impressions: number | null;        // Impresiones (no disponible con YouTube Data API)
  likes: number;                     // Número de likes
  comments: number;                  // Número de comentarios
  shares: number;                    // Shares (no disponible en Data API; se puede obtener vía Analytics)
  saved: number;                     // Guardados (no disponible)
  viewing_time_total: number | null; // Tiempo total de visualización (se obtiene vía Analytics)
  viewing_time_avg: number | null;   // Tiempo promedio de visualización (se obtiene vía Analytics)
  engagement: number;                // Engagement total (por ejemplo, likes + comments + shares; sin saved)
  engagement_rate: number;           // Engagement rate (engagement / reach)
  createdAt: Date;                   // Fecha de publicación (timestamp)
}
