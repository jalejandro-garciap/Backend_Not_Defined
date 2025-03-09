import { InstagramMedia } from './instagram_video.interface';

export interface InstagramMediaListResponse {
  data: InstagramMedia[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
}