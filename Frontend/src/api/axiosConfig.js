import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

const STORAGE_KEYS = {
    ACCESS:  'hackract_access_token',
    REFRESH: 'hackract_refresh_token',
};

// ── Circuit breaker ───────────────────────────────────────────────────────────
// Prevents multiple simultaneous refresh attempts and stops infinite loops.
let isRefreshing       = false;
let refreshSubscribers = [];       // queued requests waiting for the new token
let refreshFailed      = false;    // once true, never retry until next login

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const notifySubscribers     = (token) => { refreshSubscribers.forEach(cb => cb(token)); refreshSubscribers = []; };
const rejectSubscribers     = () => { refreshSubscribers.forEach(cb => cb(null)); refreshSubscribers = []; };

// ── Force logout helper (no React dependency) ─────────────────────────────────
const nukeSession = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS);
    localStorage.removeItem(STORAGE_KEYS.REFRESH);
    refreshFailed = true;
    // Redirect to login without a full React re-render cycle
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
};

// ── REQUEST interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use(
    (config) => {
        // Skip adding the header for the refresh endpoint itself
        if (!config._isRefreshRequest) {
            const token = localStorage.getItem(STORAGE_KEYS.ACCESS);
            if (token) config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── RESPONSE interceptor — handle 401 with single refresh attempt ─────────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const is401           = error.response?.status === 401;
        const alreadyRetried  = originalRequest._retry;
        const isRefreshRoute  = originalRequest.url?.includes('/auth/local/refresh');

        // If the refresh itself returned 401, nuke the session immediately
        if (is401 && isRefreshRoute) {
            nukeSession();
            rejectSubscribers();
            isRefreshing = false;
            return Promise.reject(error);
        }

        // If 401 but already retried, or circuit breaker tripped — bail out
        if (!is401 || alreadyRetried || refreshFailed) {
            return Promise.reject(error);
        }

        const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH);
        if (!storedRefreshToken) {
            nukeSession();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // If a refresh is already in flight, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh((newToken) => {
                    if (!newToken) { reject(error); return; }
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    resolve(api(originalRequest));
                });
            });
        }

        // Start a refresh
        isRefreshing = true;
        try {
            const { data } = await api.post(
                '/auth/local/refresh',
                { refreshToken: storedRefreshToken },
                { _isRefreshRequest: true },   // flag to skip the request interceptor
            );

            const { accessToken, refreshToken: newRefreshToken } = data.data.tokens;
            localStorage.setItem(STORAGE_KEYS.ACCESS,  accessToken);
            localStorage.setItem(STORAGE_KEYS.REFRESH, newRefreshToken);

            notifySubscribers(accessToken);
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            return api(originalRequest);
        } catch (refreshError) {
            nukeSession();
            rejectSubscribers();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    },
);

export default api;
