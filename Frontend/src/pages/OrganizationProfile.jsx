import { useEffect, useRef, useState } from "react";
import api from "../api/axiosConfig";
import { uploadFile } from "../api/uploadService.js";
import toast from "react-hot-toast";

const Icons = {
  Building: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M9 21V7l6-4v18M9 7H3v14M15 21V11" /></svg>,
  Camera: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>,
  Pencil: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  Briefcase: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  Gavel: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14 13l-4 4m-3.5-3.5a2.828 2.828 0 0 1 4-4L18.6 1.4a1.414 1.414 0 0 1 2 2L12.5 11.5a2.828 2.828 0 0 1-4 4L2.4 21.6a1.414 1.414 0 0 1-2-2L6.5 13.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h6M15 21h6" /></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  FileText: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-4 h-4 text-blue-500"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  UsersGroup: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  ShieldCheck: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Eye: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
};

const initials = (name) => name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "AC";

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest ml-1">
      {label}
    </label>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className="w-full border border-white/10 rounded-sm bg-white/[0.02] text-sm text-white placeholder-gray-600
      focus:outline-none focus:border-[#00c477]/50 transition-all font-mono px-4 py-3"
  />
);

const SectionCard = ({ title, icon: IconComp, children }) => (
  <div className="bg-[#141518] border border-white/5 rounded-xl overflow-hidden mb-6">
    <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
      <div className="flex items-center gap-3 text-[#00c477]">
        <IconComp />
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="text-gray-500 hover:text-white transition-colors cursor-pointer">
        <Icons.Pencil />
      </div>
    </div>
    <div className="p-6 space-y-6">{children}</div>
  </div>
);

export default function OrganizationProfile() {
  const fileInputRef = useRef(null);
  const licenseInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState(null);

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);

  const [form, setForm] = useState({
    name: "", website: "", industry: "", companyType: "", foundedYear: "", size: "", description: "",
    country: "", state: "", city: "", subCity: "", addressLine1: "", postalCode: "", mapsLink: "",
    taxId: "", registrationNumber: "", licenseIssueDate: "", licenseExpiryDate: "", businessLicenseUrl: "",
    contactFirstName: "", contactLastName: "", primaryEmail: "", phoneNumber: "", contactJobTitle: "", contactLinkedin: "",
    slug: ""
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/organizations");
        const orgs = data?.data?.organizations || data?.organizations || [];
        if (orgs?.length > 0) {
          const org = orgs[0];
          setOrganizationId(org.id);
          setForm({
            name: org.name || "", website: org.website || "", industry: org.industry || "", companyType: org.companyType || "",
            foundedYear: org.foundedYear || "", size: org.size || "", description: org.description || "",
            country: org.country || "", state: org.state || "", city: org.city || "", subCity: org.subCity || "",
            addressLine1: org.addressLine1 || "", postalCode: org.postalCode || "", mapsLink: org.mapsLink || "",
            taxId: org.taxId || "", registrationNumber: org.registrationNumber || "",
            licenseIssueDate: org.licenseIssueDate || "", licenseExpiryDate: org.licenseExpiryDate || "",
            businessLicenseUrl: org.businessLicenseUrl || "",
            contactFirstName: org.contactFirstName || "", contactLastName: org.contactLastName || "",
            primaryEmail: org.primaryEmail || "", phoneNumber: org.phoneNumber || "",
            contactJobTitle: org.contactJobTitle || "", contactLinkedin: org.contactLinkedin || "",
            slug: org.slug || ""
          });
          if (org.logoUrl) setLogoPreview(org.logoUrl);
        }
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setLogoFile(file);
  };

  const handleLicenseChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalLogoUrl = form.logoUrl;
      if (logoFile) {
        toast.loading("Uploading logo...", { id: "uploadLogo" });
        finalLogoUrl = await uploadFile(logoFile, 'org-logos');
        toast.success("Logo uploaded", { id: "uploadLogo" });
      }

      let finalLicenseUrl = form.businessLicenseUrl;
      if (licenseFile) {
        toast.loading("Uploading business license...", { id: "uploadLicense" });
        finalLicenseUrl = await uploadFile(licenseFile, 'org-documents');
        toast.success("License uploaded", { id: "uploadLicense" });
      }

      const payload = { ...form };
      if (finalLogoUrl) payload.logoUrl = finalLogoUrl;
      if (finalLicenseUrl) payload.businessLicenseUrl = finalLicenseUrl;
      if (!payload.slug && payload.name) payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      if (organizationId) {
        await api.patch(`/organizations/${organizationId}`, payload);
        toast.success("Organization profile updated");
      } else {
        const { data } = await api.post("/organizations", payload);
        if (data?.data?.id) setOrganizationId(data.data.id);
        toast.success("Organization profile created");
      }
      setLogoFile(null);
      setLicenseFile(null);
    } catch (err) {
      const errorResponse = err?.response?.data;
      if (errorResponse?.errors && Array.isArray(errorResponse.errors) && errorResponse.errors.length > 0) {
        // Tell the user exactly which field failed validation
        const firstError = errorResponse.errors[0];
        toast.error(`${firstError.message || `Validation failed for field: ${firstError.field}`}`);
      } else {
        toast.error(errorResponse?.message || "Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-[#00c477] font-mono">Loading...</div>;
  }

  const displayName = form.name || "Acme Corp.";

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans text-white p-8 md:p-12 selection:bg-[#00c477]/30 selection:text-[#00c477]">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-1">Workspace Settings</p>
            <h1 className="text-3xl font-bold tracking-tight">Organization Profile</h1>
          </div>
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#00c477] text-black font-mono font-bold text-xs uppercase tracking-widest rounded shadow-lg hover:bg-[#00e68c] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Top Card */}
        <div className="bg-[#141518] border border-white/5 rounded-xl p-8 flex items-center gap-6 mb-8 relative">
          <div className="relative group">
            <div className="w-24 h-24 rounded-xl bg-[#0a0a0c] border border-white/10 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white font-sans">{initials(displayName)}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#141518] text-[#00c477] border border-white/10 flex items-center justify-center hover:bg-[#00c477] hover:text-black transition-colors"
            >
              <Icons.Camera />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">{displayName}</h2>
          </div>
        </div>

        {/* Company Information */}
        <SectionCard title="Company Information" icon={Icons.Building}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Company Name">
              <Input name="name" value={form.name} onChange={handleChange} placeholder="Acme Corp." />
            </Field>
            <Field label="Domain">
              <Input name="website" value={form.website} onChange={handleChange} placeholder="acmecorp.com" />
            </Field>
            <Field label="Industry">
              <Input name="industry" value={form.industry} onChange={handleChange} placeholder="Technology / Cyber Security" />
            </Field>
            <Field label="Company Type">
              <Input name="companyType" value={form.companyType} onChange={handleChange} placeholder="Private Enterprise" />
            </Field>
            <Field label="Founded Year">
              <Input name="foundedYear" value={form.foundedYear} onChange={handleChange} placeholder="2018" />
            </Field>
            <Field label="Team Size">
              <Input name="size" value={form.size} onChange={handleChange} placeholder="50 - 200 Employees" />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              name="description" value={form.description} onChange={handleChange} rows={4}
              placeholder="Acme Corp is a leading provider..."
              className="w-full border border-white/10 rounded-sm bg-white/[0.02] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-all font-mono px-4 py-3 resize-none"
            />
          </Field>
        </SectionCard>

        {/* Location */}
        <SectionCard title="Location" icon={Icons.MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Country">
              <Input name="country" value={form.country} onChange={handleChange} placeholder="Ethiopia" />
            </Field>
            <Field label="Region">
              <Input name="state" value={form.state} onChange={handleChange} placeholder="Addis Ababa" />
            </Field>
            <Field label="City">
              <Input name="city" value={form.city} onChange={handleChange} placeholder="Addis Ababa" />
            </Field>
            <Field label="Sub-City">
              <Input name="subCity" value={form.subCity} onChange={handleChange} placeholder="Bole" />
            </Field>
          </div>
          <div className="mt-6">
            <Field label="Street Address">
              <Input name="addressLine1" value={form.addressLine1} onChange={handleChange} placeholder="Bole Road, Dembel City Center, 5th Floor" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Field label="P.O. Box">
              <Input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="12345" />
            </Field>
            <Field label="Maps Link">
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[#00c477]"><Icons.Link /></span>
                <Input name="mapsLink" value={form.mapsLink} onChange={handleChange} className="w-full border border-white/10 rounded-sm bg-white/[0.02] text-sm text-[#00c477] placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-all font-mono pl-9 pr-4 py-3" placeholder="https://maps.google.com/..." />
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Legal & Registration */}
        <SectionCard title="Legal & Registration" icon={Icons.Gavel}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="TIN Number">
              <Input name="taxId" value={form.taxId} onChange={handleChange} placeholder="0012345678" />
            </Field>
            <Field label="Business Registration Number">
              <Input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} placeholder="MT/AA/1/00123/2018" />
            </Field>
            <Field label="License Issue Date">
              <Input type="date" name="licenseIssueDate" value={form.licenseIssueDate} onChange={handleChange} className="w-full border border-white/10 rounded-sm bg-white/[0.02] text-sm text-gray-400 focus:outline-none focus:border-[#00c477]/50 transition-all font-mono px-4 py-3 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
            </Field>
            <Field label="License Expiry Date">
              <Input type="date" name="licenseExpiryDate" value={form.licenseExpiryDate} onChange={handleChange} className="w-full border border-white/10 rounded-sm bg-white/[0.02] text-sm text-gray-400 focus:outline-none focus:border-[#00c477]/50 transition-all font-mono px-4 py-3 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
            </Field>
          </div>
          <div className="mt-6">
            <Field label="Business License">
              <div className="mt-1 flex flex-col gap-3">
                <input ref={licenseInputRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleLicenseChange} />

                {(licenseFile || form.businessLicenseUrl) ? (
                  <div className="flex items-center justify-between border border-white/10 rounded-lg p-4 bg-[#0a0a0c]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-[#141518] text-gray-400 flex items-center justify-center border border-white/5">
                        <Icons.FileText />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{licenseFile ? licenseFile.name : "business_license_2023.pdf"}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          {licenseFile ? `${(licenseFile.size / 1024 / 1024).toFixed(1)} MB` : "4.2 MB"} • Uploaded {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00c477]/10 text-[#00c477] border border-[#00c477]/20 text-[9px] font-mono font-bold uppercase tracking-widest">
                        <Icons.ShieldCheck /> Verified
                      </span>
                      <button type="button" className="text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded">
                        <Icons.Eye />
                      </button>
                      <button type="button" className="text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded">
                        <Icons.Download />
                      </button>
                    </div>
                  </div>
                ) : null}
                <button type="button" onClick={() => licenseInputRef.current?.click()} className="self-start text-xs font-mono text-[#00c477] hover:underline">
                  {form.businessLicenseUrl || licenseFile ? "Replace File" : "+ Upload Document"}
                </button>
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Contact Person */}
        <SectionCard title="Contact Person" icon={Icons.User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="First Name">
              <Input name="contactFirstName" value={form.contactFirstName} onChange={handleChange} placeholder="Abebe" />
            </Field>
            <Field label="Last Name">
              <Input name="contactLastName" value={form.contactLastName} onChange={handleChange} placeholder="Kebede" />
            </Field>
            <Field label="Work Email">
              <Input name="primaryEmail" value={form.primaryEmail} onChange={handleChange} placeholder="abebe.k@acmecorp.com" />
            </Field>
            <Field label="Phone Number">
              <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="+251 911 223 344" />
            </Field>
            <Field label="Job Title">
              <Input name="contactJobTitle" value={form.contactJobTitle} onChange={handleChange} placeholder="Head of Security Operations" />
            </Field>
            <Field label="LinkedIn Profile">
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[#00c477]"><Icons.Link /></span>
                <Input name="contactLinkedin" value={form.contactLinkedin} onChange={handleChange} className="w-full border border-white/10 rounded-sm bg-white/[0.02] text-sm text-[#00c477] placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-all font-mono pl-9 pr-4 py-3" placeholder="linkedin.com/in/abekebede" />
              </div>
            </Field>
          </div>
        </SectionCard>

        <div className="h-12" /> {/* Bottom padding */}
      </form>
    </div>
  );
}
