import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { useAuth0 } from "@auth0/auth0-react";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import { hasRole as checkRole, hasAnyRole as checkAnyRole, getPrimaryRole, getDashboardPath, getRoleTypes } from "../utils/roles.js";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  ACCESS: "hackract_access_token",
  REFRESH: "hackract_refresh_token",
};

export const AuthProvider = ({ children }) => {
  const { isAuthenticated, logout: auth0Logout } = useAuth0();
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCESS));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(STORAGE_KEYS.REFRESH));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(localStorage.getItem(STORAGE_KEYS.ACCESS)));

  const persistTokens = useCallback((nextAccess, nextRefresh) => {
    if (nextAccess) {
      localStorage.setItem(STORAGE_KEYS.ACCESS, nextAccess);
      setAccessToken(nextAccess);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS);
      setAccessToken(null);
    }

    if (nextRefresh) {
      localStorage.setItem(STORAGE_KEYS.REFRESH, nextRefresh);
      setRefreshToken(nextRefresh);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH);
      setRefreshToken(null);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!accessToken) {
      setIsBootstrapping(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/local/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUser(data?.data?.user || null);
    } catch (error) {
      console.error("Failed to load profile", error);
      persistTokens(null, null);
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }, [accessToken, persistTokens, refreshToken]);

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
        const { user: loggedInUser, tokens } = data.data;
        persistTokens(tokens.accessToken, tokens.refreshToken);
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
    [persistTokens]
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

        if (tokens?.accessToken && tokens?.refreshToken) {
          persistTokens(tokens.accessToken, tokens.refreshToken);
          setUser(newUser);
        } else {
          persistTokens(null, null);
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
    [persistTokens]
  );

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) throw new Error("No refresh token available");
    const { data } = await api.post("/auth/local/refresh", { refreshToken });
    const { tokens, user: refreshedUser } = data.data;
    persistTokens(tokens.accessToken, tokens.refreshToken);
    if (refreshedUser) setUser(refreshedUser);
    return tokens.accessToken;
  }, [persistTokens, refreshToken]);

  const logout = useCallback(async (options = {}) => {
    const { skipAuth0Redirect = false } = options;
    try {
      if (refreshToken) {
        const { data } = await api.post("/auth/logout", { refreshToken });
        const message = data?.message || "Logged out from local session";
        toast.success(message);
      } else {
        toast.success("Logged out");
      }
    } catch (error) {
      console.warn("Logout warning:", error?.message);
      toast.error("Logout failed. Clearing local session.");
    } finally {
      persistTokens(null, null);
      setUser(null);
      if (isAuthenticated && !skipAuth0Redirect) {
        auth0Logout({
          logoutParams: {
            returnTo: `${window.location.origin}/login`,
          },
        });
      }
    }
  }, [persistTokens, refreshToken, isAuthenticated, auth0Logout]);

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
