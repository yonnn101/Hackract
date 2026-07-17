import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiAlertTriangle, FiFileText, FiShield, FiUserCheck, FiChevronRight } from 'react-icons/fi';

const HackerVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [missingAgreements, setMissingAgreements] = useState([]);
  const [signing, setSigning] = useState(false);
  
  const [formData, setFormData] = useState({
    idDocumentNumber: '',
    bio: '',
    country: '',
    yearsOfExperience: '',
    primarySkills: [],
    certifications: [],
    portfolioLinks: []
  });

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/hacker-profiles/me/status');
      setProfile(data.data.profile);
      setMissingAgreements(data.data.missingAgreements);
      if (data.data.profile) {
        setFormData({
          idDocumentNumber: data.data.profile.idDocumentNumber || '',
          bio: data.data.profile.bio || '',
          country: data.data.profile.country || '',
          yearsOfExperience: data.data.profile.yearsOfExperience || '',
          primarySkills: data.data.profile.primarySkills || [],
          certifications: data.data.profile.certifications || [],
          portfolioLinks: data.data.profile.portfolioLinks || []
        });
      }
    } catch (error) {
      toast.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSign = async (title) => {
    setSigning(true);
    try {
      await api.post('/hacker-profiles/me/sign-agreement', { agreementTitle: title });
      toast.success(`Signed: ${title}`);
      fetchStatus();
    } catch (error) {
      toast.error('Failed to sign agreement');
    } finally {
      setSigning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (missingAgreements.length > 0) {
      toast.error('You must sign all mandatory agreements first');
      return;
    }
    
    try {
      await api.put('/hacker-profiles/me', { ...formData, status: 'SUBMITTED' });
      toast.success('Hacker profile submitted for review!');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
       <div className="text-[#00c477] animate-pulse">INITIATING_VERIFICATION_CHECK...</div>
    </div>
  );

  const isApproved = profile?.status === 'APPROVED';
  const isSubmitted = profile?.status === 'SUBMITTED';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl ${isApproved ? 'bg-[#00c477]/20 text-[#00c477]' : 'bg-amber-500/20 text-amber-500'}`}>
              {isApproved ? <FiUserCheck /> : <FiShield />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Operator Verification</h1>
              <p className="text-gray-400 text-sm">Legally certify your status to join high-stakes engagements.</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest ${
            isApproved ? 'bg-[#00c477]/20 text-[#00c477] border border-[#00c477]/30' : 
            isSubmitted ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
            'bg-amber-500/20 text-amber-500 border border-amber-500/30'
          }`}>
            Status: {profile?.status || 'UNVERIFIED'}
          </div>
        </div>

        {isApproved && (
          <div className="bg-[#00c477]/10 border border-[#00c477]/30 p-4 rounded-xl flex items-center gap-4">
             <FiCheckCircle className="text-[#00c477] text-2xl shrink-0" />
             <p className="text-sm text-[#00c477]">Your operator status is <strong>APPROVED</strong>. You have full access to organization projects and AI-augmented tools.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* Main Form */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl shadow-black/40">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FiFileText className="text-[#00c477]" />
                Identity & Experience
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">ID / Passport Number</label>
                    <input 
                      disabled={isApproved || isSubmitted}
                      value={formData.idDocumentNumber}
                      onChange={(e) => setFormData({...formData, idDocumentNumber: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#00c477] transition-colors"
                      placeholder="e.g. A12345678"
                    />
                    <div className="mt-2">
                      <button 
                        type="button"
                        onClick={() => navigate('/national-id-verification')}
                        className="text-[10px] text-[#00c477] hover:underline flex items-center gap-1 font-mono uppercase"
                      >
                        <FiShield /> Verify with Ethiopia National ID (Fayda)
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Country of Residence</label>
                    <input 
                      disabled={isApproved || isSubmitted}
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#00c477] transition-colors"
                      placeholder="e.g. Estonia"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Operator Bio (Mission Profile)</label>
                  <textarea 
                    disabled={isApproved || isSubmitted}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#00c477] transition-colors resize-none"
                    placeholder="Describe your technical expertise and background..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Years of Experience</label>
                    <input 
                      disabled={isApproved || isSubmitted}
                      type="number"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#00c477] transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <button 
                      type="submit"
                      disabled={isApproved || isSubmitted || missingAgreements.length > 0}
                      className="w-full bg-[#00c477] hover:bg-[#00cc6e] text-black font-bold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00c477]/20"
                    >
                      {isSubmitted ? 'SUBMITTED FOR REVIEW' : isApproved ? 'VERIFIED OPERATOR' : 'SUBMIT FOR REVIEW'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Agreements Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-md font-semibold flex items-center gap-2">
                <FiChevronRight className="text-[#00c477]" />
                Legal Compliance
              </h2>
              
              <div className="space-y-3">
                {['Mutual Non-Disclosure Agreement (MNDA)', 'Ethical Hacking Code of Conduct'].map(title => {
                  const isSigned = !missingAgreements.includes(title);
                  return (
                    <div key={title} className={`p-4 rounded-xl border transition-all ${isSigned ? 'bg-[#00c477]/5 border-[#00c477]/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono tracking-tighter uppercase px-2 py-0.5 rounded ${isSigned ? 'bg-[#00c477]/20 text-[#00c477]' : 'bg-amber-500/20 text-amber-500'}`}>
                          {isSigned ? 'SIGNED' : 'REQUIRED'}
                        </span>
                        {isSigned && <FiCheckCircle className="text-[#00c477]" />}
                      </div>
                      <div className="text-xs font-bold leading-tight mb-3">{title}</div>
                      {!isSigned && (
                        <button 
                          onClick={() => handleSign(title)}
                          disabled={signing}
                          className="w-full py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-[10px] font-mono uppercase tracking-widest transition-colors"
                        >
                          {signing ? 'SIGNING...' : 'REVIEW & SIGN'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-500 text-xs font-bold">
                  <FiAlertTriangle />
                  Legal Note
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Participation in organization-hosted pentests requires a valid MNDA. Unauthorized testing or data leakage will result in immediate legal action and platform ban.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackerVerification;
