import { Configuration, AuthApi, UsersApi, DefaultApi } from './generated';

const getConfig = () => {
  if (typeof window === 'undefined') {
    return new Configuration({ basePath: 'http://localhost:3001' });
  }
  
  const token = localStorage.getItem('access_token');
  
  return new Configuration({
    basePath: 'http://localhost:3001',
    accessToken: token || undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const authApi = new AuthApi(getConfig());
export const usersApi = new UsersApi(getConfig());
export const defaultApi = new DefaultApi(getConfig());

// Helper to refresh API instances when token changes (e.g. after login)
export const refreshApiConfig = () => {
  const config = getConfig();
  // We can't reassign the exported constants, but we can rely on getConfig() being called
  // OR we can export a function that returns the APIs
  return {
    authApi: new AuthApi(config),
    usersApi: new UsersApi(config),
    defaultApi: new DefaultApi(config)
  };
};