import { Configuration, AuthApi, UsersApi, DefaultApi, UploadsApi, PdfsApi, TestTakingApi, TestsApi, TestAttemptsApi, Middleware } from './generated';

const BASE_PATH = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const authMiddleware: Middleware = {
  post: async (context) => {
    if (context.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return context.response;
  },
};

const getConfig = () => {
  if (typeof window === 'undefined') {
    return new Configuration({ basePath: BASE_PATH });
  }

  const token = localStorage.getItem('access_token');

  return new Configuration({
    basePath: BASE_PATH,
    accessToken: token || undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    middleware: [authMiddleware],
  });
};

export const authApi = new AuthApi(new Configuration({ basePath: BASE_PATH }));
export const usersApi = new UsersApi(getConfig());
export const defaultApi = new DefaultApi(getConfig());
export const uploadsApi = new UploadsApi(getConfig());
export const pdfsApi = new PdfsApi(getConfig());
export const testTakingApi = new TestTakingApi(getConfig());
export const testAttemptsApi = new TestAttemptsApi(getConfig());

export const getPdfsApi = () => new PdfsApi(getConfig());
export const getUsersApi = () => new UsersApi(getConfig());
export const getTestTakingApi = () => new TestTakingApi(getConfig());
export const getTestAttemptsApi = () => new TestAttemptsApi(getConfig());
export const getTestsApi = () => new TestsApi(getConfig());

// Helper to refresh API instances when token changes (e.g. after login)
export const refreshApiConfig = () => {
  const config = getConfig();
  return {
    authApi: new AuthApi(new Configuration({ basePath: BASE_PATH })),
    usersApi: new UsersApi(config),
    defaultApi: new DefaultApi(config),
    uploadsApi: new UploadsApi(config),
    pdfsApi: new PdfsApi(config),
    testTakingApi: new TestTakingApi(config),
    testAttemptsApi: new TestAttemptsApi(config),
    testsApi: new TestsApi(config),
  };
};

// Non-authenticated API instances for testing
export const getNoAuthApiConfig = () => {
  const noAuthConfig = new Configuration({ basePath: BASE_PATH });
  return {
    uploadsApi: new UploadsApi(noAuthConfig),
    pdfsApi: new PdfsApi(noAuthConfig),
  };
};
