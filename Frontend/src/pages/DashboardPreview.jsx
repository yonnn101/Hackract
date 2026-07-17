import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import api from '../api/axiosConfig';
import {
  FiGrid,
  FiFolder,
  FiFileText,
  FiSettings,
  FiPlus,
  FiActivity,
  FiCheckCircle,
  FiShield,
  FiChevronRight
} from 'react-icons/fi';

const DashboardPreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [projectsRes, findingsRes] = await Promise.all([
          api.get('/projects'),
          api.get('/findings')
        ]);

        const allProjects = projectsRes.data?.data || projectsRes.data || [];
        setProjects(allProjects.filter(p => p.isPersonal || p.leadPentesterId === user?.id || p.collaborators?.some(c => c.userId === user?.id)));

        const allFindings = findingsRes.data?.data || findingsRes.data || [];
        setFindings(Array.isArray(allFindings) ? allFindings : []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PLANNING').length;
  const completedProjects = projects.filter(p => p.status === 'COMPLETED' || p.status === 'CLOSED').length;
  const criticalVulns = findings.filter(f => f.severity === 'CRITICAL').length;
  const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 100;

  const activeOperativesProjects = projects.slice(0, 3);

  const displayName = user?.fullName || user?.handle || 'Operative';

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-gray-300 font-sans selection:bg-[#00ff88]/30 h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto block w-full space-y-6 lg:space-y-8">

        {/* STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[
            { label: 'TOTAL PROJECTS', value: loading ? '-' : totalProjects, icon: FiActivity, color: 'text-gray-400' },
            { label: 'ACTIVE PROJECTS', value: loading ? '-' : activeProjects, icon: FiGrid, color: 'text-[#00ff88]', isPrimary: true },
            { label: 'COMPLETED', value: loading ? '-' : completedProjects, icon: FiCheckCircle, color: 'text-gray-400' },
            { label: 'CRITICAL VULNS', value: loading ? '-' : criticalVulns, icon: FiShield, color: 'text-red-500', alert: criticalVulns > 0 },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden">
              {stat.isPrimary && <div className="absolute top-0 right-0 w-24 h-24 bg-[#00ff88]/5 rounded-bl-full filter blur-xl"></div>}
              <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">{stat.label}</div>
              <div className="flex items-end justify-between">
                <div className="text-4xl font-bold text-white flex items-center gap-2">
                  {stat.value}
                  {stat.alert && <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-md tracking-widest font-mono">CRITICAL</span>}
                </div>
                <stat.icon size={28} className={stat.color} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* LEFT COLUMN - ACTIVE OPERATIVES & PROJECTS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Active Projects</h2>
                <p className="text-sm text-gray-500">Managing ongoing penetration tests and security audits</p>
              </div>
              <button onClick={() => navigate('/projects')} className="text-sm px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white transition-colors w-full sm:w-auto">
                View All Projects
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 flex-wrap">
              {/* Create New */}
              <div
                onClick={() => navigate('/projects')}
                className="bg-[#111111] border border-dashed border-white/20 hover:border-[#00ff88]/50 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center text-center h-48 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#00ff88]/10 flex items-center justify-center mb-4 transition-colors">
                  <FiPlus className="text-xl text-gray-400 group-hover:text-[#00ff88] transition-colors" />
                </div>
                <h3 className="font-bold text-white">Create New Project</h3>
                <p className="text-xs text-gray-500 mt-1">Initiate a new security node</p>
              </div>

              {loading ? (
                <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 h-48 flex items-center justify-center text-gray-500 text-sm">
                  Loading projects...
                </div>
              ) : (
                activeOperativesProjects.map((p) => {
                  const pFindings = findings.filter(f => f.pentestId === p.id || f.projectId === p.id);
                  const criticalCount = pFindings.filter(f => f.severity === 'CRITICAL').length;

                  return (
                    <div key={p.id} onClick={() => {
                      if (p.workflows && p.workflows.length > 0) {
                        navigate(`/workflows/${p.workflows[0].id}`);
                      } else {
                        navigate(`/projects/${p.id}`);
                      }
                    }} className="bg-[#111111] border border-white/5 rounded-2xl p-6 h-48 flex flex-col justify-between relative hover:border-white/10 transition-colors cursor-pointer">
                      <div className={`absolute top-6 right-6 text-xs font-mono font-bold px-2 py-0.5 rounded ${p.status === 'IN_PROGRESS' ? 'text-black bg-[#00ff88]' : p.status === 'PLANNING' ? 'text-[#b490ff] bg-[#b490ff]/10 border border-[#b490ff]/30' : 'text-gray-400 bg-white/5'}`}>
                        {p.status || 'ACTIVE'}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg truncate pr-16">{p.name || 'Project'}</h3>
                        <p className="text-xs font-mono text-gray-500 mt-1 truncate">{p.description || 'Security Node'}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Vulnerabilities</span>
                          <span className={`${criticalCount > 0 ? 'text-red-400 font-bold' : pFindings.length > 0 ? 'text-yellow-500 font-bold' : 'text-gray-500'}`}>{pFindings.length} Found</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                          {criticalCount > 0 ? (
                            <div className="w-1/3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                          ) : pFindings.length > 0 ? (
                            <div className="w-1/4 bg-orange-400"></div>
                          ) : (
                            <div className="w-full bg-[#00ff88]"></div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Updated {new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleDateString()}</span>
                        <span className="text-[#00ff88] font-semibold flex items-center hover:underline">
                          Open Project <FiChevronRight className="ml-1" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 mt-8 lg:mt-0">

            {/* Profile Card */}
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative cursor-pointer" onClick={() => navigate('/hacker-profile')}>
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      className="w-16 h-16 rounded-xl bg-gray-800 border-2 border-[#111111] shadow-[0_0_0_2px_#00ff88] object-cover"
                      alt="Profile"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#00ff88]/20 border-2 border-[#111111] shadow-[0_0_0_2px_#00ff88] flex items-center justify-center text-[#00ff88] text-2xl font-bold">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00ff88] border-2 border-[#111111] rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white cursor-pointer hover:text-[#00ff88] transition-colors" onClick={() => navigate('/hacker-profile')}>{displayName}</h2>
                  <div className="text-xs text-[#00ff88] font-semibold flex items-center gap-1">
                    {user?.role === 'HACKER' ? 'Hacker' : 'Operative'}
                  </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex items-center gap-0.5 text-yellow-500 text-xs">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>
                            {i < Math.round(user?.averageRating || 0) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="text-white font-bold text-xs">{Number(user?.averageRating || 0).toFixed(1)}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ({user?.totalReviews || 0} {(user?.totalReviews || 0) === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#161616] rounded-xl p-3 text-center border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Reputation</div>
                  <div className="font-bold text-white text-lg">{user?.trustScore ?? 100}</div>
                </div>
                <div className="bg-[#161616] rounded-xl p-3 text-center border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Success Rate</div>
                  <div className="font-bold text-white text-lg">{loading ? '100%' : `${successRate}%`}</div>
                </div>
              </div>

              <button onClick={() => navigate('/hacker-profile')} className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2 text-sm">
                <FiSettings size={14} /> Edit Profile
              </button>
            </div>

            {/* Priority Comms */}
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-400 text-xs tracking-widest uppercase">Priority Comms</h3>
                <span className="text-[10px] bg-[#00ff88]/20 text-[#00ff88] px-2 py-0.5 rounded font-bold">LIVE</span>
              </div>

              <div className="space-y-3">
                {projects.slice(0, 1).map((p, i) => (
                  <div key={i} onClick={() => {
                    if (p.workflows && p.workflows.length > 0) {
                      navigate(`/workflows/${p.workflows[0].id}`);
                    } else {
                      navigate(`/projects/${p.id}`);
                    }
                  }} className="flex items-start gap-3 p-3 bg-[#00ff88]/5 rounded-xl border-l-2 border-[#00ff88] cursor-pointer relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#00ff88]/10 rounded-bl-full mix-blend-screen pointer-events-none"></div>
                    <div className="w-8 h-8 rounded bg-gray-800 text-[#00ff88] flex items-center justify-center shrink-0">
                      <FiFolder size={14} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Project Activity: {p.name}</div>
                      <div className="text-xs text-[#00ff88] mt-0.5">Recent updates detected in workspace.</div>
                    </div>
                  </div>
                ))}

                <div onClick={() => navigate('/messages')} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <FiFileText size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">System Messages</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">Check your inbox for communications.</div>
                  </div>
                </div>

                {criticalVulns > 0 && (
                  <div onClick={() => navigate('/findings')} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-xl border-l-2 border-red-500 cursor-pointer">
                    <div className="w-8 h-8 rounded bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <FiShield size={14} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Critical Alerts ({criticalVulns})</div>
                      <div className="text-xs text-red-400 truncate mt-0.5">Immediate attention required on findings.</div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => navigate('/findings')} className="w-full text-center text-xs text-gray-400 hover:text-white mt-4 font-bold tracking-widest">
                VIEW ALL ALERTS
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;
