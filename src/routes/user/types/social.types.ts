export type Social = {
  id: string;
  social_media_name: string;
  username: string;
  img: string;
  email: string | null;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt?: Date;
};
