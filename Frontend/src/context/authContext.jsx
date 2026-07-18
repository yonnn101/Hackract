import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { useAuth0 } from "@auth0/auth0-react";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import { hasRole as checkRole, hasAnyRole as checkAnyRole, getPrimaryRole, getDashboardPath, getRoleTypes } from "../utils/roles.js";

const AuthContext = createContext(null);

const LOGGED_IN_KEY = "hackract_logged_in";

export const AuthProvider = ({ children }) => {
  const { isAuthenticated, logout: auth0Logout } = useAuth0();
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(LOGGED_IN_KEY) === 'true');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(isLoggedIn);

  const accessToken = isLoggedIn ? 'cookie-session' : null;
  const refreshToken = isLoggedIn ? 'cookie-session' : null;

  const fetchProfile = useCallback(async () => {
    if (!isLoggedIn) {
      setIsBootstrapping(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/local/me");
      setUser(data?.data?.user || null);
    } catch (error) {
      console.error("Failed to load profile", error);
      localStorage.removeItem(LOGGED_IN_KEY);
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const extractMessage = (error) => {
    const detail = error?.response?.data?.details?.errors?.[0]?.message;
    return (
      detail ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Something went wrong"
    );
  };

  const login = useCallback(
    async (credentials) => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/local/login", credentials);
        const { user: loggedInUser } = data.data;
        localStorage.setItem(LOGGED_IN_KEY, 'true');
        setIsLoggedIn(true);
        setUser(loggedInUser);
        toast.success("Logged in successfully");
        return data.data;
      } catch (error) {
        toast.error(extractMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/local/register", payload);
        console.info("[auth] registration success", data);
        const { data: payloadData, message: topMessage } = data || {};
        const { user: newUser, tokens, message: nestedMessage } = payloadData || {};
        const successMessage = nestedMessage || topMessage || "Registration successful. Please verify your email.";

        if (tokens) {
          localStorage.setItem(LOGGED_IN_KEY, 'true');
          setIsLoggedIn(true);
          setUser(newUser);
        } else {
          localStorage.removeItem(LOGGED_IN_KEY);
          setIsLoggedIn(false);
          setUser(null);
        }

        toast.success(successMessage);
        return payloadData;
      } catch (error) {
        console.error("[auth] registration failed", error?.response?.data || error);
        toast.error(extractMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshTokens = useCallback(async () => {
    const { data } = await api.post("/auth/local/refresh", {});
    const { user: refreshedUser } = data.data;
    if (refreshedUser) setUser(refreshedUser);
    return 'cookie-session';
  }, []);

  const logout = useCallback(async (options = {}) => {
    const { skipAuth0Redirect = false } = options;
    try {
      if (isLoggedIn) {
        const { data } = await api.post("/auth/logout");
        const message = data?.message || "Logged out from local session";
        toast.success(message);
      } else {
        toast.success("Logged out");
      }
    } catch (error) {
      console.warn("Logout warning:", error?.message);
      toast.error("Logout failed. Clearing local session.");
    } finally {
      localStorage.removeItem(LOGGED_IN_KEY);
      setIsLoggedIn(false);
      setUser(null);
      if (isAuthenticated && !skipAuth0Redirect) {
        auth0Logout({
          logoutParams: {
            returnTo: `${window.location.origin}/login`,
          },
        });
      }
    }
  }, [isLoggedIn, isAuthenticated, auth0Logout]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading: loading || isBootstrapping,
      login,
      register,
      logout,
      refreshTokens,
      setUser,
      refreshUser: fetchProfile,
      // Role helpers — bound to the current user
      hasRole: (role) => checkRole(user, role),
      hasAnyRole: (...roles) => checkAnyRole(user, ...roles),
      primaryRole: getPrimaryRole(user),
      dashboardPath: getDashboardPath(user),
      roleTypes: getRoleTypes(user),
    }),
    [user, accessToken, refreshToken, loading, isBootstrapping, login, register, logout, refreshTokens, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
