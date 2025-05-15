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
  shares: number;                    // Shares (no disponible en Data API; se obtiene vía Analytics)
  saved: number;                     // Guardados (no disponible)
  viewing_time_total: number | null; // Tiempo total de visualización (se obtiene vía Analytics)
  viewing_time_avg: number | null;   // Tiempo promedio de visualización (se obtiene vía Analytics)
  engagement: number;                // Engagement total (por ejemplo, likes + comments + shares; sin saved)
  engagement_rate: number;           // Engagement rate (engagement / reach)
  createdAt: Date;                   // Fecha de publicación (timestamp)
  tags?: string[];                   // Etiquetas del video
  
  // YouTube Analytics API fields
  annotationClickThroughRate: number | null;  // Tasa de clics en anotaciones
  annotationCloseRate: number | null;         // Tasa de cierre de anotaciones
  averageViewDuration: number | null;         // Duración media de visualización
  dislikes: number | null;                    // Número de dislikes (ya no disponible públicamente, pero puede estar en Analytics)
  estimatedMinutesWatched: number | null;     // Minutos estimados de visualización
  estimatedRevenue: number | null;            // Ingresos estimados
  subscribersGained: number | null;           // Suscriptores ganados
  subscribersLost: number | null;             // Suscriptores perdidos
  viewerPercentage: any;                      // Porcentaje de espectadores (demografía)
}
