export interface TiktokProfile {
  provider: string;
  id: string;
  unionId: string;
  username: string;
  profileImage: string;
  bioDescription?: any;
  profileDeepLink?: any;
  isVerified?: any;
  followerCount: number;
  following_count: number;
  likes_count: number;
}