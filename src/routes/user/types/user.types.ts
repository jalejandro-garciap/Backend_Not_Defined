export type UserLogin = {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  img: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
};
