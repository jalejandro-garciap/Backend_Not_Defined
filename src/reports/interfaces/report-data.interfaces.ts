export interface ReportData {
  title: string;
  date: Date;
  metrics: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
  };
  videos: Array<{
    title: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    createdAt: Date;
  }>;
}

export interface IReportGenerator {
  generateReport(data: any): Promise<Buffer>;
}
