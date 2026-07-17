import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiChevronRight, FiChevronLeft, FiBriefcase, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../context/authContext.jsx';

const OrgOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    companySize: '',
    website: '',
    address: '',
    taxId: ''
  });

  useEffect(() => {
    const existingOrg = user?.organizations?.[0]?.organization;
    if (existingOrg) {
      setFormData((prev) => ({
        ...prev,
        name: existingOrg.name || prev.name,
        description: existingOrg.description || prev.description,
        industry: existingOrg.industry || prev.industry,
        companySize: existingOrg.companySize || prev.companySize,
        website: existingOrg.website || prev.website,
        address: existingOrg.addressLine1 || prev.address,
        taxId: existingOrg.taxId || prev.taxId,
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const websiteFormatted = formData.website && !/^https?:\/\//i.test(formData.website.trim())
        ? `https://${formData.website.trim()}`
        : formData.website?.trim();

      const existingOrg = user?.organizations?.[0]?.organization;
      const orgPayload = {
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry,
        companySize: formData.companySize,
        website: websiteFormatted,
        addressLine1: formData.address,
        taxId: formData.taxId,
      };
      let orgId = existingOrg?.id;

      if (!orgId) {
        const { data: createData } = await api.post('/organizations', {
          ...orgPayload,
          slug: generateSlug(formData.name),
        });
        orgId = createData.data.id;
      } else {
        await api.patch(`/organizations/${orgId}`, orgPayload);
      }

      // submit-verification accepts only specific fields; send only those to avoid Joi unknown key errors.
      await api.post(`/organizations/${orgId}/submit-verification`, {
        taxId: formData.taxId,
        industry: formData.industry,
        companySize: formData.companySize,
        website: websiteFormatted,
        address: formData.address,
      });

      toast.success('Organization verified and submitted successfully!');
      setTimeout(() => {
        // Full reload to sync AuthContext with new organization memberships
        window.location.href = '/dashboard';
      }, 1500);

    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to setup organization. Please try again.');
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.industry || !formData.companySize || !formData.website) {
        toast.error('Please complete all required fields.');
        return;
      }
    }
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
      
      {/* Progress Indicator */}
      <div className="mb-8">
        <h1 className="text-3xl font-mono font-bold mb-2">Organization Setup</h1>
        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-gray-500 mb-6">
            <span className={step >= 1 ? "text-sky-400" : ""}>1. Business Profile</span>
            <FiChevronRight />
            <span className={step >= 2 ? "text-sky-400" : ""}>2. Legal & Registration</span>
        </div>
        
        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div 
                className="h-full bg-sky-400 transition-all duration-500 ease-out" 
                style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
        </div>
      </div>

      <div className="min-h-[400px]">
        {/* STEP 1: BUSINESS PROFILE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-gray-200">
              <FiBriefcase className="text-sky-400" /> Corporate Identity
            </h2>
            <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Organization / Company Name *</label>
                <input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors"
                    placeholder="e.g. Acme Corporation"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Industry *</label>
                    <select 
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors text-white appearance-none"
                    >
                        <option value="" disabled>Select Industry...</option>
                        <option value="Technology">Technology / Software</option>
                        <option value="Finance">Finance / Banking</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="E-commerce">Retail / E-commerce</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Company Size *</label>
                    <select 
                        name="companySize"
                        value={formData.companySize}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors text-white appearance-none"
                    >
                        <option value="" disabled>Select Size...</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500+">500+ employees</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Official Website *</label>
                <input 
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors"
                    placeholder="https://www.company.com"
                />
            </div>
            
            <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Short Description (Optional)</label>
                <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors resize-none"
                    placeholder="Briefly describe what your company does..."
                />
            </div>
          </div>
        )}

        {/* STEP 2: LEGAL & REGISTRATION */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-gray-200">
              <FiMapPin className="text-sky-400" /> Registration Details
            </h2>
            <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-400 leading-relaxed">
                  To ensure a trusted ecosystem, we require verifiable registration details before you can launch pentest programs.
                </p>
            </div>
            
            <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Registered Address *</label>
                <textarea 
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors resize-none"
                    placeholder="123 Security Lane&#10;Suite 100&#10;San Francisco, CA 94105"
                />
            </div>
            
            <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase font-mono tracking-tighter">Tax ID / EIN / VAT Number *</label>
                <input 
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sky-400 transition-colors"
                    placeholder="XX-XXXXXXX"
                />
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
        <button 
            onClick={prevStep}
            disabled={step === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono uppercase tracking-widest text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
            <FiChevronLeft /> Back
        </button>
        
        {step < totalSteps ? (
          <button 
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#00c477] text-black rounded-lg text-sm font-mono font-bold uppercase tracking-widest hover:bg-[#00ff9d] transition-all active:scale-95 shadow-lg shadow-[#00c477]/20"
          >
            Continue <FiChevronRight />
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={loading || !formData.address || !formData.taxId}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#00c477] text-black rounded-lg text-sm font-mono font-bold uppercase tracking-widest hover:bg-[#00ff9d] transition-all active:scale-95 shadow-lg shadow-[#00c477]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'INITIALIZING...' : 'FINISH SETUP'} <FiCheckCircle />
          </button>
        )}
      </div>

    </div>
  );
};

export default OrgOnboarding;
