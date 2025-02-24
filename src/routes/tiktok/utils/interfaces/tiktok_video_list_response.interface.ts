import { TikTokError } from './tiktok_error.interface';
import { TikTokVideo } from './tiktok_video.interface';

export interface TikTokVideoListResponse {
  data: {
    videos: TikTokVideo[];
    cursor: string;
    has_more: boolean;
  };
  error: TikTokError;
}
