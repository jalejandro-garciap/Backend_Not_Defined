import { InstagramMetrics } from './instagram_metrics.interface';

export interface InstagramMediaListResponse {
  data: InstagramMetrics[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
}