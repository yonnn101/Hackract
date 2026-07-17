import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiAlertTriangle, FiFileText, FiShield, FiBriefcase, FiChevronRight, FiGlobe, FiMapPin } from 'react-icons/fi';

const OrganizationVerification = () => {
  const { user } = useAuth();
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    taxId: '',
    industry: '',
    companySize: '',
    website: '',
    address: ''
  });

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/organizations/${organizationId}`);
      setOrganization(data.data);
      if (data.data) {
        setFormData({
          taxId: data.data.taxId || '',
          industry: data.data.industry || '',
          companySize: data.data.companySize || '',
          website: data.data.website || '',
          address: data.data.address || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load organization status');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/organizations/${organizationId}/submit-verification`, formData);
      toast.success('Organization verification submitted for review!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-[#00c477]">
       <div className="animate-pulse">VERIFYING_ENTITY_CREDENTIALS...</div>
    </div>
  );

  const status = organization?.verificationStatus || 'DRAFT';
  const isApproved = status === 'APPROVED';
  const isSubmitted = status === 'SUBMITTED';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl ${isApproved ? 'bg-[#00c477]/20 text-[#00c477]' : 'bg-sky-500/20 text-sky-500'}`}>
              {isApproved ? <FiCheckCircle /> : <FiBriefcase />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Organization Verification</h1>
              <p className="text-gray-400 text-sm">Register your business entity to launch security programs.</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest ${
            isApproved ? 'bg-[#00c477]/20 text-[#00c477] border border-[#00c477]/30' : 
            isSubmitted ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
            'bg-amber-500/20 text-amber-500 border border-amber-500/30'
          }`}>
            Status: {status}
          </div>
        </div>

        {isApproved && (
          <div className="bg-[#00c477]/10 border border-[#00c477]/30 p-4 rounded-xl flex items-center gap-4">
             <FiCheckCircle className="text-[#00c477] text-2xl shrink-0" />
             <p className="text-sm text-[#00c477]">Your organization is <strong>APPROVED</strong>. You can now define security programs and invite operators.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* Main Form */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl shadow-black/40">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FiFileText className="text-sky-400" />
                Business Profile
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Tax ID / Registration #</label>
                    <input 
                      disabled={isApproved || isSubmitted}
                      value={formData.taxId}
                      onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors"
                      placeholder="e.g. VAT-12345678"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Industry</label>
                    <select 
                      disabled={isApproved || isSubmitted}
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors appearance-none"
                      required
                    >
                      <option value="">Select Industry</option>
                      <option value="Fintech">Fintech</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="SaaS">SaaS</option>
                      <option value="Government">Government</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Company Size</label>
                    <select 
                      disabled={isApproved || isSubmitted}
                      value={formData.companySize}
                      onChange={(e) => setFormData({...formData, companySize: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors appearance-none"
                      required
                    >
                      <option value="">Select Size</option>
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="201-500">201-500 Employees</option>
                      <option value="500+">500+ Employees</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter flex items-center gap-1">
                      <FiGlobe className="text-[10px]" /> Website
                    </label>
                    <input 
                      disabled={isApproved || isSubmitted}
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors"
                      placeholder="https://company.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter flex items-center gap-1">
                    <FiMapPin className="text-[10px]" /> Business Address
                  </label>
                  <textarea 
                    disabled={isApproved || isSubmitted}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors resize-none"
                    placeholder="Enter full legal address..."
                    required
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isApproved || isSubmitted || submitting}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'PROCESSING...' : isSubmitted ? 'PENDING REVIEW' : isApproved ? 'ENTITY VERIFIED' : 'SUBMIT BUSINESS PROFILE'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Guidelines Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-md font-semibold flex items-center gap-2">
                <FiShield className="text-sky-400" />
                Vetting Guidelines
              </h2>
              
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-sky-400/20 flex items-center justify-center text-[10px] text-sky-400 shrink-0 font-bold">1</div>
                  <p className="text-xs text-gray-400 leading-relaxed">Ensure your **Tax ID** matches the legal name provided during registration.</p>
                </li>
                <li className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-sky-400/20 flex items-center justify-center text-[10px] text-sky-400 shrink-0 font-bold">2</div>
                  <p className="text-xs text-gray-400 leading-relaxed">Our compliance team will review your business standing within **24-48 hours**.</p>
                </li>
                <li className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-sky-400/20 flex items-center justify-center text-[10px] text-sky-400 shrink-0 font-bold">3</div>
                  <p className="text-xs text-gray-400 leading-relaxed">Once approved, you can initiate payments and launch private security engagements.</p>
                </li>
              </ul>

              <div className="p-4 bg-sky-400/5 border border-sky-400/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                  <FiAlertTriangle />
                  Important
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Hackract requires all organizations to be verified before interacting with hackers to ensure financial and legal security for all parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationVerification;

