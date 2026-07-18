import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

const LOGGED_IN_KEY = 'hackract_logged_in';

// ── Circuit breaker ───────────────────────────────────────────────────────────
// Prevents multiple simultaneous refresh attempts and stops infinite loops.
let isRefreshing       = false;
let refreshSubscribers = [];       // queued requests waiting for the refresh
let refreshFailed      = false;    // once true, never retry until next login

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const notifySubscribers     = () => { refreshSubscribers.forEach(cb => cb(true)); refreshSubscribers = []; };
const rejectSubscribers     = () => { refreshSubscribers.forEach(cb => cb(false)); refreshSubscribers = []; };

// ── Force logout helper (no React dependency) ─────────────────────────────────
const nukeSession = () => {
    localStorage.removeItem(LOGGED_IN_KEY);
    refreshFailed = true;
    // Redirect to login without a full React re-render cycle
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
};

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

        const isLoggedIn = localStorage.getItem(LOGGED_IN_KEY) === 'true';
        if (!isLoggedIn) {
            nukeSession();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // If a refresh is already in flight, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh((success) => {
                    if (!success) { reject(error); return; }
                    resolve(api(originalRequest));
                });
            });
        }

        // Start a refresh
        isRefreshing = true;
        try {
            await api.post(
                '/auth/local/refresh',
                {}, // refresh token is sent automatically via cookie
                { _isRefreshRequest: true },   // flag to skip any manual interceptors if any
            );

            notifySubscribers();
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
