import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";
import api from "../api/axiosConfig.js";
import { FiLock } from "react-icons/fi";
import { getPrimaryRole, ROLES } from "../utils/roles.js";

/**
 * ShareableView — Resolves a share token and redirects the viewer to the
 * actual project workspace. The viewer has already been added as a VIEWER
 * collaborator on the project, so they can access the workspace directly.
 *
 * If the user is not authenticated, they are redirected to login first.
 */
const ShareableView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [error, setError] = useState(null);

  useEffect(() => {
    // Wait until auth is resolved before doing anything
    if (authLoading) return;

    if (!user) {
      // Redirect to login, preserving the intended destination
      navigate(`/login?redirect=/share/${token}`, { replace: true });
      return;
    }

    const resolveToken = async () => {
      try {
        const { data } = await api.get(`/projects/share/${token}`);
        const projectId = data.data?.id;
        if (!projectId) {
          setError("Could not resolve project from this link.");
          return;
        }
        // Route to the correct workspace path based on the user's role
        const role = getPrimaryRole(user);
        let path;
        if (role === ROLES.ORG_ADMIN) {
          path = `/org-projects/${projectId}`;
        } else if (role === ROLES.PROJECT_ADMIN) {
          path = `/pa-projects/${projectId}`;
        } else {
          path = `/projects/${projectId}`;
        }
        navigate(path, { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || "Invalid or revoked shareable link.");
      }
    };

    resolveToken();
  }, [token, user, authLoading, navigate]);


  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-6 text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <FiLock className="text-rose-500 text-3xl" />
        </div>
        <div className="space-y-2">
          <p className="text-white font-black text-lg uppercase tracking-widest">Access Denied</p>
          <p className="text-white/40 font-mono text-xs">{error}</p>
        </div>
        <button
          onClick={() => navigate("/hacker-dashboard")}
          className="px-6 py-2 border border-white/10 hover:border-[#00ff88]/50 text-white hover:text-[#00ff88] rounded-xl transition-all font-mono text-xs uppercase tracking-widest"
        >
          Return Home
        </button>
      </div>
    );
  }

  // Loading / resolving state
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
      <div className="w-8 h-8 border-2 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin" />
      <p className="text-[#00ff88] font-mono text-xs uppercase tracking-widest">Verifying Access Token...</p>
    </div>
  );
};

export default ShareableView;
