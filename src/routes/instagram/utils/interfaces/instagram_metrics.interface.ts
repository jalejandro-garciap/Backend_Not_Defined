export interface InstagramMetrics {
  creator: string;                   // Nombre de usuario del creador
  social_media: string;              // Nombre de la red social (ej. 'instagram')
  permalink: string;                 // Enlace a la publicación
  description: string;               // Lista de hashtags extraídos del caption
  followers_count: number;           // Número de seguidores del usuario
  video_views: number | null;        // Reproducciones (no disponible, por lo tanto puede ser null)
  reach: number;                     // Alcance (personas diferentes)
  impressions: number | null;        // Impresiones (null si no aplica)
  likes: number;                     // Número de likes
  comments: number;                  // Número de comentarios
  shares: number;                    // Número de shares
  saved: number;                     // Número de guardados
  viewing_time_total: number | null; // Tiempo total de visualización (para reels, si aplica)
  viewing_time_avg: number | null;   // Tiempo promedio de visualización (para reels, si aplica)
  engagement: number;                // Engagement total (suma de likes, comentarios, guardados y shares)
  engagement_rate: number;           // Engagement Rate (engagement / reach)
}
