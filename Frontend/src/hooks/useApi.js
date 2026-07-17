import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import api from "../api/axiosConfig";
import { useAuth } from "../context/authContext.jsx";

const useApi = () => {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const { accessToken, refreshToken, refreshTokens, logout } = useAuth();

    useEffect(() => {
        const requestInterceptor = api.interceptors.request.use(
            async (config) => {
                // Prefer local JWT if present
                if (accessToken) {
                    config.headers.Authorization = `Bearer ${accessToken}`;
                    return config;
                }

                // Fallback to Auth0 if authenticated
                if (isAuthenticated) {
                    try {
                        const token = await getAccessTokenSilently();
                        config.headers.Authorization = `Bearer ${token}`;
                    } catch (error) {
                        console.error("Error getting Auth0 token", error);
                    }
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseInterceptor = api.interceptors.response.use(
            (response) => response,
            async (error) => {
                const status = error?.response?.status;
                const originalRequest = error.config;

                if (status === 401 && refreshToken && !originalRequest?._retry) {
                    originalRequest._retry = true;
                    try {
                        const newAccess = await refreshTokens();
                        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                        return api(originalRequest);
                    } catch {
                        await logout({ skipAuth0Redirect: true });
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.request.eject(requestInterceptor);
            api.interceptors.response.eject(responseInterceptor);
        };
    }, [accessToken, refreshToken, refreshTokens, logout, getAccessTokenSilently, isAuthenticated]);

    return api;
};

export default useApi;
