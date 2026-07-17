import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useApi from "./useApi";
import { useAuth } from "../context/authContext.jsx";

const useAuthSync = () => {
    const { isAuthenticated, isLoading, user: auth0User } = useAuth0();
    const { user: localUser, setUser } = useAuth();
    const api = useApi();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const syncUser = async () => {
            if (isAuthenticated && !isLoading && !localUser) {
                try {
                    const { data } = await api.get("/auth/me");
                    if (data?.data?.user) {
                        const fetchedUser = data.data.user;
                        setUser(fetchedUser);
                        console.log("User state synchronized with AuthContext.");

                        try {
                            // Decide redirect target: prefer explicit selection stored before OAuth
                            const selected = window.localStorage.getItem('selected_account_type');
                            let destination = null;

                            if (selected === 'ORGANIZATION') {
                                destination = '/org-dashboard';
                            } else if (selected === 'HACKER') {
                                destination = '/hacker-dashboard';
                            } else if (Array.isArray(fetchedUser.roles) && fetchedUser.roles.length > 0) {
                                const primary = fetchedUser.roles[0].type;
                                if (primary === 'ORG_ADMIN') destination = '/org-dashboard';
                                else if (primary === 'PROJECT_ADMIN') destination = '/org-dashboard/projects';
                                else destination = '/hacker-dashboard';
                            } else {
                                // fallback
                                destination = '/hacker-dashboard';
                            }

                            // Only redirect if currently on an auth route or root
                            const path = location.pathname;
                            const isAuthRoute = path === '/' || path.startsWith('/login') || path.startsWith('/register');
                            if (isAuthRoute && destination && path !== destination) {
                                // clear selection to avoid future forced redirects
                                window.localStorage.removeItem('selected_account_type');
                                navigate(destination, { replace: true });
                            }
                        } catch (redirErr) {
                            console.warn('Redirect error:', redirErr);
                        }
                    }
                } catch (error) {
                    console.error("Backend synchronization failed:", error);
                }
            }
        };

        syncUser();
    }, [isAuthenticated, isLoading, api, auth0User, localUser, setUser, navigate, location]);
};

export default useAuthSync;
