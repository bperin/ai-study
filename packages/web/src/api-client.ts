import { Configuration, AuthApi, UsersApi, DefaultApi, UploadsApi, PdfsApi } from "./generated";

const getConfig = () => {
    if (typeof window === "undefined") {
        return new Configuration({ basePath: "http://localhost:3000" });
    }

    const token = localStorage.getItem("access_token");

    return new Configuration({
        basePath: "http://localhost:3000",
        accessToken: token || undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
};

export const authApi = new AuthApi(getConfig());
export const usersApi = new UsersApi(getConfig());
export const defaultApi = new DefaultApi(getConfig());
export const uploadsApi = new UploadsApi(getConfig());
export const pdfsApi = new PdfsApi(getConfig());

// Helper to refresh API instances when token changes (e.g. after login)
export const refreshApiConfig = () => {
    const config = getConfig();
    return {
        authApi: new AuthApi(config),
        usersApi: new UsersApi(config),
        defaultApi: new DefaultApi(config),
        uploadsApi: new UploadsApi(config),
        pdfsApi: new PdfsApi(config),
    };
};
