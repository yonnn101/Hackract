import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiBriefcase, FiCheckCircle, FiXCircle, FiMapPin, FiGlobe, FiUsers, FiTag } from 'react-icons/fi';

const OrgReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrg();
  }, [id]);

  const fetchOrg = async () => {
    try {
      // NOTE: Normally use GET /organizations/:id, 
      // but if the endpoint expects user membership, we fetch from search
      const { data } = await api.get('/organizations/search', { params: { limit: 100 } });
      const found = data.data.find(o => o.id === id);
      if (found) {
        setOrg(found);
      } else {
        toast.error('Organization not found.');
        navigate('/admin/approvals');
      }
    } catch (error) {
      toast.error('Failed to load organization details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      await api.post(`/organizations/${id}/${action}`);
      toast.success(`Organization ${action}d successfully.`);
      navigate('/admin/approvals');
    } catch (error) {
      toast.error(`Failed to ${action} organization.`);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0f16] p-8 text-white font-mono">LOADING ORGANIZATION...</div>;
  if (!org) return null;

  return (
    <div className="min-h-screen bg-[#0a0f16] text-white font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-6">
          <button 
            onClick={() => navigate('/admin/approvals')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
          >
            <FiArrowLeft /> Back to Queue
          </button>
          <div className="flex gap-4">
            <button 
              onClick={() => handleAction('reject')}
              className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg font-mono text-sm font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <FiXCircle /> Reject App
            </button>
            <button 
              onClick={() => handleAction('approve')}
              className="px-6 py-2.5 bg-[#00c477] text-black rounded-lg font-mono text-sm font-bold uppercase tracking-widest hover:bg-green-400 shadow-lg shadow-[#00c477]/20 transition-all flex items-center gap-2"
            >
              <FiCheckCircle /> Approve App
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Brand Identity */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="h-24 w-24 rounded-full bg-[#00c477]/20 flex items-center justify-center text-[#00c477] mb-4">
                        <FiBriefcase size={40} />
                    </div>
                    <h2 className="text-xl font-bold">{org.name}</h2>
                    <p className="text-[#00c477] font-mono text-sm mt-1">/{org.slug}</p>
                    
                    <div className="w-full mt-6 pt-6 border-t border-white/10 text-left space-y-3">
                        <div>
                            <p className="text-gray-500 text-xs font-mono uppercase text-center mb-2 justify-center flex items-center gap-1"><FiGlobe /> Official Website</p>
                            <a href={org.website} target="_blank" rel="noreferrer" className="text-gray-200 font-mono text-sm text-center block truncate hover:text-[#00c477] transition-colors">{org.website || 'Not Provided'}</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Business Verification Info */}
            <div className="md:col-span-2 space-y-6">
                
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4 uppercase tracking-widest font-mono">
                        <FiMapPin className="text-[#00c477]" /> Registered Address
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-wrap font-mono bg-black/40 p-4 rounded-lg border border-white/5">
                        {org.address || 'No address provided.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4 uppercase tracking-widest font-mono">
                            <FiTag className="text-[#00c477]" /> Industry
                        </h3>
                        <p className="text-white text-lg font-mono">{org.industry || 'Unknown'}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4 uppercase tracking-widest font-mono">
                            <FiUsers className="text-[#00c477]" /> Company Size
                        </h3>
                        <p className="text-white text-lg font-mono">{org.companySize || 'Unknown'} <span className="text-gray-500 text-sm">Employees</span></p>
                    </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-500 mb-1 uppercase tracking-widest font-mono">
                        Tax ID / EIN Verification
                    </h3>
                    <p className="text-gray-400 text-xs mb-4">Validate this identifier against local tax registries before approving.</p>
                    <p className="text-white text-2xl font-mono tracking-widest bg-black/50 p-4 rounded border border-yellow-500/10 inline-block">
                        {org.taxId || 'NOT PROVIDED'}
                    </p>
                </div>

            </div>

        </div>
      </div>
    </div>
  );
};

export default OrgReview;
