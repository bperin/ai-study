import { Configuration, AuthApi, UsersApi, DefaultApi, UploadsApi, PdfsApi } from "./generated";

const BASE_PATH = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const getConfig = () => {
    if (typeof window === "undefined") {
        return new Configuration({ basePath: BASE_PATH });
    }

    const token = localStorage.getItem("access_token");

    return new Configuration({
        basePath: BASE_PATH,
        accessToken: token || undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
};

export const authApi = new AuthApi(new Configuration({ basePath: BASE_PATH }));
export const usersApi = new UsersApi(getConfig());
export const defaultApi = new DefaultApi(getConfig());
export const uploadsApi = new UploadsApi(getConfig());
export const pdfsApi = new PdfsApi(getConfig());

export const getPdfsApi = () => new PdfsApi(getConfig());

// Helper to refresh API instances when token changes (e.g. after login)
export const refreshApiConfig = () => {
    const config = getConfig();
    return {
        authApi: new AuthApi(new Configuration({ basePath: BASE_PATH })),
        usersApi: new UsersApi(config),
        defaultApi: new DefaultApi(config),
        uploadsApi: new UploadsApi(config),
        pdfsApi: new PdfsApi(config),
    };
};
