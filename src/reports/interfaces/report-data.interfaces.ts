export interface ReportData {
  title: string;
  subtitle: string;
  date: Date;
  metrics: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    totalDuration?: number; // Opcional para Instagram
    averageEngagementRate: number;
    totalSaved?: number;
    // Campos para YouTube Analytics
    totalEstimatedMinutesWatched?: number;
    totalSubscribersGained?: number;
    totalSubscribersLost?: number;
    averageViewDuration?: number;
  };
  videos: ReportDataMedia[];
  users?: UserMetrics[];
  charts: {
    viewsChartBase64: string;
    engagementChartBase64: string;
    likesComparisonBase64: string;
    engagementComparisonBase64: string;
    userComparisonBase64?: string;
  };
  isInstagram?: boolean; // Bandera para distinguir el tipo de reporte
  isYoutube?: boolean; // Bandera para distinguir el tipo de reporte
}

export interface UserMetrics {
  userId: string;
  username: string;
  videoCount: number; // Mantener coherencia en el nombre (cuenta de videos o publicaciones)
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalSaved?: number; // Solo para Instagram
  averageEngagement: number;
  // Campos para YouTube Analytics
  totalEstimatedMinutesWatched?: number;
  totalSubscribersGained?: number;
  totalSubscribersLost?: number;
  averageViewDuration?: number;
}

export interface ReportDataMedia {
  title: string;
  views: number;
  likes: number;
  shares: number;
  favorites?: number;
  comments: number;
  saved?: number; // Solo para Instagram
  createdAt: Date;
  duration?: number; // Solo para TikTok
  shareUrl: string;
  engagementRate: number;
  id: string;
  userId?: string;
  username?: string;
  mediaType?: string; // Solo para Instagram
  mediaUrl?: string; // Solo para Instagram
  // Campos para YouTube Analytics
  annotationClickThroughRate?: number;
  annotationCloseRate?: number;
  averageViewDuration?: number;
  dislikes?: number;
  estimatedMinutesWatched?: number;
  estimatedRevenue?: number;
  subscribersGained?: number;
  subscribersLost?: number;
  viewerPercentage?: any;
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
}

export interface IReportGenerator {
  generateReport(data: ReportData): Promise<Buffer>;
  generateMultiUserReport(data: ReportData): Promise<Buffer>;
}
