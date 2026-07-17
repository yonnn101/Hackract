import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiCheckCircle, FiXCircle, FiFileText, FiLink, FiAward } from 'react-icons/fi';

const OperatorReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      // NOTE: Normally there would be a GET /hacker-profiles/:id endpoint for admins.
      // If it doesn't exist uniquely, we can fetch all and find it.
      const { data } = await api.get('/hacker-profiles', { params: { limit: 100 } });
      const found = data.data.find(h => h.id === id);
      if (found) {
        setProfile(found);
      } else {
        toast.error('Profile not found.');
        navigate('/admin/approvals');
      }
    } catch (error) {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      await api.post(`/hacker-profiles/${id}/${action}`);
      toast.success(`Hacker Profile ${action}d successfully.`);
      navigate('/admin/approvals');
    } catch (error) {
      toast.error(`Failed to ${action} profile.`);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0f16] p-8 text-white font-mono">LOADING PROFILE...</div>;
  if (!profile) return null;

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
              <FiXCircle /> Reject Profile
            </button>
            <button 
              onClick={() => handleAction('approve')}
              className="px-6 py-2.5 bg-sky-500 text-white rounded-lg font-mono text-sm font-bold uppercase tracking-widest hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              <FiCheckCircle /> Approve Profile
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Core Identity */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="h-24 w-24 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                        <FiUser size={40} />
                    </div>
                    <h2 className="text-xl font-bold">{profile.user?.fullName}</h2>
                    <p className="text-sky-400 font-mono text-sm mt-1">@{profile.user?.handle}</p>
                    <p className="text-gray-400 text-xs mt-4 uppercase tracking-widest">{profile.country || 'No Country Specified'}</p>
                    
                    <div className="w-full mt-6 pt-6 border-t border-white/10 text-left space-y-3">
                        <div>
                            <p className="text-gray-500 text-xs font-mono uppercase">ID Document Number</p>
                            <p className="text-gray-200 font-mono mt-1">{profile.idDocumentNumber || 'Not Provided'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-mono uppercase">Years of Experience</p>
                            <p className="text-gray-200 font-mono mt-1">{profile.yearsOfExperience || 0} Years</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Bio & Skills */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200 mb-4">
                        <FiFileText className="text-sky-400" /> Biography
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-wrap">
                        {profile.bio || 'No biography provided.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4 uppercase tracking-widest font-mono">
                            Primary Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.primarySkills?.length > 0 ? profile.primarySkills.map(skill => (
                                <span key={skill} className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-mono uppercase">
                                    {skill}
                                </span>
                            )) : <span className="text-gray-500 text-sm">None listed.</span>}
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4 uppercase tracking-widest font-mono">
                            <FiAward className="text-yellow-400" /> Certifications
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.certifications?.length > 0 ? profile.certifications.map(cert => (
                                <span key={cert} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-mono uppercase">
                                    {cert}
                                </span>
                            )) : <span className="text-gray-500 text-sm">None listed.</span>}
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4 uppercase tracking-widest font-mono">
                        <FiLink className="text-sky-400" /> Portfolio Links
                    </h3>
                    <div className="space-y-2">
                        {profile.portfolioLinks?.length > 0 ? profile.portfolioLinks.map(link => (
                            <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-sky-400 hover:underline text-sm truncate">
                                {link}
                            </a>
                        )) : <span className="text-gray-500 text-sm">No links provided.</span>}
                    </div>
                </div>

            </div>

        </div>
      </div>
    </div>
  );
};

export default OperatorReview;
