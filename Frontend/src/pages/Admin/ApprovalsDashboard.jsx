import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiClock, FiSearch, FiUser, FiBriefcase, FiEye } from 'react-icons/fi';

const ApprovalsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hackers');
  const [hackers, setHackers] = useState([]);
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both simultaneously
      const [hackerRes, orgRes] = await Promise.all([
        api.get('/hacker-profiles', { params: { limit: 100 } }),
        api.get('/organizations/search', { params: { limit: 100 } }) // Using search to get all orgs, wait we might need to filter by status
      ]);

      // Filter for SUBMITTED status client-side if the API doesn't support status filters out of the box
      const pendingHackers = (hackerRes.data.data || []).filter(h => h.status === 'SUBMITTED');
      const pendingOrgs = (orgRes.data.data || []).filter(o => o.verificationStatus === 'SUBMITTED');

      setHackers(pendingHackers);
      setOrgs(pendingOrgs);
    } catch (error) {
      toast.error('Failed to load pending approvals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type, id, action) => {
    try {
      const endpoint = type === 'hacker' 
        ? `/hacker-profiles/${id}/${action}` // approve | reject
        : `/organizations/${id}/${action}`;
      
      await api.post(endpoint);
      toast.success(`Successfully ${action}d!`);
      fetchData(); // Refresh lists
    } catch (error) {
      toast.error(`Failed to ${action}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f16] text-white font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
              <h1 className="text-3xl font-mono font-bold text-white mb-2">VERIFICATION PIPELINE</h1>
              <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
                  {hackers.length + orgs.length} PENDING APPROVALS
              </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-white/20 rounded-md hover:bg-white/10 transition-colors font-mono text-xs text-white uppercase"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button 
            className={`px-6 py-4 font-mono text-sm uppercase tracking-widest transition-colors ${activeTab === 'hackers' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-gray-500 hover:text-white'}`}
            onClick={() => setActiveTab('hackers')}
          >
            <div className="flex items-center gap-2">
              <FiUser /> Operators ({hackers.length})
            </div>
          </button>
          <button 
            className={`px-6 py-4 font-mono text-sm uppercase tracking-widest transition-colors ${activeTab === 'orgs' ? 'border-b-2 border-[#00c477] text-[#00c477]' : 'text-gray-500 hover:text-white'}`}
            onClick={() => setActiveTab('orgs')}
          >
            <div className="flex items-center gap-2">
              <FiBriefcase /> Organizations ({orgs.length})
            </div>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center font-mono text-gray-500 animate-pulse">
             FETCHING QUEUE...
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Hackers List */}
            {activeTab === 'hackers' && (
              hackers.length === 0 ? (
                <div className="py-20 text-center border border-white/5 rounded-xl bg-white/5 font-mono text-gray-500">
                  NO PENDING OPERATORS
                </div>
              ) : (
                hackers.map(hacker => (
                  <div key={hacker.id} className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center justify-between hover:border-sky-500/50 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
                        <FiUser size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{hacker.user?.fullName || 'Unknown User'}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span className="font-mono">@{hacker.user?.handle || hacker.userId.substring(0,8)}</span>
                          <span className="flex items-center gap-1 text-sky-400"><FiClock size={12}/> {new Date(hacker.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/admin/approvals/hacker/${hacker.id}`)}
                        className="p-2 border border-white/20 rounded hover:bg-white/10 bg-transparent text-gray-300" 
                        title="View Details"
                      >
                        <FiEye size={18} />
                      </button>
                      <button 
                        onClick={() => handleAction('hacker', hacker.id, 'reject')}
                        className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded font-mono text-xs uppercase hover:bg-red-500 hover:text-white transition-all"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleAction('hacker', hacker.id, 'approve')}
                        className="px-4 py-2 bg-sky-500 text-white rounded font-mono text-xs uppercase hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Organizations List */}
            {activeTab === 'orgs' && (
              orgs.length === 0 ? (
                <div className="py-20 text-center border border-white/5 rounded-xl bg-white/5 font-mono text-gray-500">
                  NO PENDING ORGANIZATIONS
                </div>
              ) : (
                orgs.map(org => (
                  <div key={org.id} className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center justify-between hover:border-[#00c477]/50 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-full bg-[#00c477]/20 flex items-center justify-center text-[#00c477]">
                        <FiBriefcase size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{org.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span className="font-mono">{org.taxId ? `TAX ID: ${org.taxId}` : 'NO TAX ID'}</span>
                          <span className="flex items-center gap-1 text-[#00c477]"><FiClock size={12}/> {new Date(org.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/admin/approvals/org/${org.id}`)}
                        className="p-2 border border-white/20 rounded hover:bg-white/10 bg-transparent text-gray-300" 
                        title="View Details"
                      >
                        <FiEye size={18} />
                      </button>
                      <button 
                        onClick={() => handleAction('org', org.id, 'reject')}
                        className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded font-mono text-xs uppercase hover:bg-red-500 hover:text-white transition-all"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleAction('org', org.id, 'approve')}
                        className="px-4 py-2 bg-[#00c477] text-black rounded font-mono text-xs font-bold uppercase hover:bg-green-400 shadow-lg shadow-[#00c477]/20 transition-all"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsDashboard;
