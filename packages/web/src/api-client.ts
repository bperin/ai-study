import { Configuration, AuthApi, UsersApi } from './generated';

const config = new Configuration({
  basePath: 'http://localhost:3000',
  accessToken: () => localStorage.getItem('access_token') || '',
});

export const authApi = new AuthApi(config);
export const usersApi = new UsersApi(config);