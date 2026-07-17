import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEdit2, FiPlus, FiCheckCircle, FiShield, FiAward, FiFolder, FiTrash2, FiCamera, FiStar } from "react-icons/fi";
import api from "../api/axiosConfig";
import { useAuth } from "../context/authContext.jsx";
import toast from "react-hot-toast";
import NationalIDService from "../services/nationalID.service.js";
import { uploadFile } from "../api/uploadService.js";

const HackerProfile = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isNationalIdVerified, setIsNationalIdVerified] = useState(false);
  const navigate = useNavigate();

  // Avatar / Identity
  const [logoPreview, setLogoPreview] = useState(null);
  const displayName = user?.fullName || user?.handle || "Digital Ghost";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Form State
  const [form, setForm] = useState({
    bio: "",
    skills: "API Testing, Vulnerability Assessment, Web Application, Ethical Hacking, OWASP",
    certifications: [],
    education: [],
    employment: [],
    other: [],
  });

  // Edit Modes
  const [editMode, setEditMode] = useState({
    bio: false,
    skills: false,
    certifications: false,
    education: false,
    employment: false,
    other: false,
  });

  // New Item State for adding entries
  const [newItem, setNewItem] = useState({});

  // Data fetching
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/hacker-profiles/me");
        const profile = data?.data?.profile;

        try {
          const statusRes = await NationalIDService.getStatus();
          const verificationStatus = statusRes?.data?.verificationStatus;
          const isVerified = Boolean(
            statusRes?.data?.isVerified ||
            verificationStatus === 'APPROVED' ||
            verificationStatus === 'VERIFIED'
          );
          setIsNationalIdVerified(isVerified);
        } catch (error) {
          console.error("Failed to fetch National ID status", error);
        }

        if (profile) {
          setForm((prev) => ({
            ...prev,
            bio: profile.bio || prev.bio,
            skills: (profile.primarySkills || []).join(", ") || prev.skills,
            certifications: profile.certifications?.length > 0
              ? profile.certifications.map(c => {
                  try {
                    return JSON.parse(c);
                  } catch {
                    return { title: c, provider: '', date: '' };
                  }
                })
              : prev.certifications,
            education: profile.education?.length > 0
              ? profile.education.map(e => {
                  try {
                    return JSON.parse(e);
                  } catch {
                    return { school: e, degree: '', from: '', to: '' };
                  }
                })
              : prev.education,
            employment: profile.employment?.length > 0
              ? profile.employment.map(e => {
                  try {
                    return JSON.parse(e);
                  } catch {
                    return { company: '', title: e, from: '', to: '' };
                  }
                })
              : prev.employment,
            other: profile.otherExperiences?.length > 0
              ? profile.otherExperiences.map(o => {
                  try {
                    return JSON.parse(o);
                  } catch {
                    return { subject: o, description: '', file: null, fileUrl: null };
                  }
                })
              : prev.other,
          }));

          if (profile.avatar) {
            setLogoPreview(profile.avatar);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Show immediate local preview
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);

    // 2. Upload to storage
    try {
      const uploadToast = toast.loading("Syncing avatar to secure storage...");
      const s3Url = await uploadFile(file, 'avatars');
      
      // 3. Update profile with the new URL
      // We pass the avatar URL to the upsert endpoint which we just updated to handle it
      await api.put("/hacker-profiles/me", { avatar: s3Url });
      
      toast.success("Avatar secured successfully", { id: uploadToast });
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error("File transmission failed. Ensure storage is configured.");
      console.error("Avatar upload error:", error);
    }
  };

  const toggleEdit = (section) => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
    setNewItem({}); // Reset new item state when toggling
  };

  const saveProfileWith = async (overrides = {}) => {
    try {
      const payload = {
        bio: form.bio,
        primarySkills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        certifications: form.certifications.map(c => JSON.stringify({
          title: c.title,
          provider: c.provider,
          certNumber: c.certNumber,
          file: c.file,
          fileUrl: c.fileUrl
        })),
        employment: form.employment.map(e => JSON.stringify({
          company: e.company,
          title: e.title,
          from: e.from,
          to: e.to
        })),
        education: form.education.map(e => JSON.stringify({
          school: e.school,
          degree: e.degree,
          from: e.from,
          to: e.to
        })),
        otherExperiences: form.other.map(o => JSON.stringify({
          subject: o.subject,
          description: o.description,
          file: o.file,
          fileUrl: o.fileUrl
        })),
        ...overrides,
      };
      await api.put('/hacker-profiles/me', payload);
      toast.success('Profile saved successfully.');
      if (refreshUser) await refreshUser();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save profile.');
    }
  };

  const saveProfile = async () => saveProfileWith();

  const handleSaveSection = async (section) => {
    toggleEdit(section);
    await saveProfile();
  };

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-[#00c477]/20 border-t-[#00c477] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 lg:p-8 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {logoPreview ? (
                  <img src={logoPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-[#00c477]">{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <FiCamera className="text-white" size={24} />
                </div>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#00c477] border-2 border-[#0c0c0c] rounded-full flex items-center justify-center">
                <FiCheckCircle className="text-[#0c0c0c]" size={12} />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {displayName}
                {(user?.isVerified || isNationalIdVerified) && (
                  <span className="ml-2 inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-400 text-black text-xs font-bold uppercase px-3 py-1 rounded-full shadow-lg">
                    <FiAward className="text-sm text-white" />
                    Verified Identity
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/5 w-fit">
                <FiStar className="text-[#00c477] fill-[#00c477] text-xs" />
                <span className="text-white font-bold text-xs">{Number(user?.averageRating || 0).toFixed(1)}</span>
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                  Rating ({user?.totalReviews || 0} {(user?.totalReviews || 0) === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* Verifications */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Verifications</h2>
              {(user?.isVerified || isNationalIdVerified) ? (
                <div className="flex items-center gap-2 text-sm">
                  <FiCheckCircle className="text-[#00c477]" />
                  <span>ID: Verified</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <FiShield />
                    <span>ID: Unverified</span>
                  </div>
                  <button onClick={() => navigate('/national-id-verification')} className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 text-[#00c477]"><FiPlus size={16} /></button>
                </div>
              )}
            </div>

            {/* Education */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 relative group">
              <h2 className="text-lg font-bold mb-4">Education</h2>

              <button onClick={() => toggleEdit('education')} className="absolute top-6 right-6 w-8 h-8 rounded-full border border-[#00c477] flex items-center justify-center hover:bg-[#00c477]/10 text-[#00c477] opacity-0 group-hover:opacity-100 transition-opacity">
                <FiPlus size={14} />
              </button>

              {editMode.education ? (
                <div className="space-y-3 mt-4 border-b border-white/5 pb-4 mb-4">
                  <input type="text" placeholder="School / University" value={newItem.school || ''} onChange={e => setNewItem({ ...newItem, school: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <input type="text" placeholder="Area of Study (Degree)" value={newItem.degree || ''} onChange={e => setNewItem({ ...newItem, degree: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="From (e.g. 2018)" value={newItem.from || ''} onChange={e => setNewItem({ ...newItem, from: e.target.value })} className="w-1/2 bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                    <input type="text" placeholder="To (e.g. 2022)" value={newItem.to || ''} onChange={e => setNewItem({ ...newItem, to: e.target.value })} className="w-1/2 bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => {
                      if (newItem.school || newItem.degree) {
                        setForm({ ...form, education: [...form.education, { school: newItem.school, degree: newItem.degree, from: newItem.from, to: newItem.to }] });
                      }
                      toggleEdit('education');
                    }} className="px-3 py-1 bg-[#00c477] text-black text-xs rounded-full font-bold">Add & Done</button>
                    <button onClick={() => toggleEdit('education')} className="px-3 py-1 bg-white/10 text-white text-xs rounded-full font-bold hover:bg-white/20">Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {form.education.length > 0 ? form.education.map((edu, idx) => (
                  <div key={idx} className="group/item relative border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <h3 className="font-semibold text-sm">{edu.school}</h3>
                    <p className="text-gray-300 text-sm">{edu.degree}</p>
                    {(edu.from || edu.to) && <p className="text-gray-500 text-xs mt-1">{edu.from} - {edu.to}</p>}
                    <button onClick={() => setForm({ ...form, education: form.education.filter((_, i) => i !== idx) })} className="absolute top-0 right-0 hidden group-hover/item:flex w-6 h-6 rounded-full bg-red-500/10 text-red-500 items-center justify-center hover:bg-red-500 hover:text-white">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No items added.</p>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* Bio Section (Description) */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 lg:p-8 space-y-6">
              <div className="relative group">
                <h2 className="text-xl font-bold mb-4">Description</h2>
                <button onClick={() => toggleEdit('bio')} className="absolute -top-1 right-0 w-8 h-8 rounded-full border border-[#00c477] flex items-center justify-center hover:bg-[#00c477]/10 text-[#00c477] opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiEdit2 size={14} />
                </button>

                {editMode.bio ? (
                  <div className="w-full">
                    <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-4 min-h-[150px] text-sm focus:outline-none resize-none" placeholder="Greetings 👋! I'm..."></textarea>
                    <div className="mt-2">
                      <button onClick={() => handleSaveSection('bio')} className="px-4 py-1.5 bg-[#00c477] text-black text-sm rounded-full font-bold">Save</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pr-10">
                    {form.bio || "Write a bit about yourself here..."}
                  </p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 lg:p-8 relative group">
              <h2 className="text-xl font-bold mb-6">Skills</h2>
              <button onClick={() => toggleEdit('skills')} className="absolute top-6 right-8 w-8 h-8 rounded-full border border-[#00c477] flex items-center justify-center hover:bg-[#00c477]/10 text-[#00c477] opacity-0 group-hover:opacity-100 transition-opacity">
                <FiEdit2 size={14} />
              </button>

              {editMode.skills ? (
                <div>
                  <textarea value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-4 text-sm focus:outline-none" placeholder="Comma separated skills..."></textarea>
                  <div className="mt-2">
                    <button onClick={() => handleSaveSection('skills')} className="px-4 py-1.5 bg-[#00c477] text-black text-sm rounded-full font-bold">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {form.skills.split(",").map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                    <span key={idx} className="px-4 py-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-full text-sm hover:bg-white/10 transition-colors cursor-default">
                      {skill}
                    </span>
                  ))}
                  {form.skills.trim() === "" && <span className="text-sm text-gray-500">No items added.</span>}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 lg:p-8 relative group">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Certifications</h2>
                <button onClick={() => toggleEdit('certifications')} className="w-8 h-8 rounded-full border border-[#00c477] flex items-center justify-center hover:bg-[#00c477]/10 text-[#00c477] opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiPlus size={16} />
                </button>
              </div>

              {editMode.certifications ? (
                <div className="space-y-3 border-b border-white/5 pb-4 mb-4">
                  <input type="text" placeholder="Certification Name" value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <input type="text" placeholder="Certification Number" value={newItem.certNumber || ''} onChange={e => setNewItem({ ...newItem, certNumber: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <input type="text" placeholder="Provider (e.g. Offensive Security)" value={newItem.provider || ''} onChange={e => setNewItem({ ...newItem, provider: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Upload Photo/File:</span>
                    <input type="file" accept="image/*,.pdf" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const toastId = toast.loading('Uploading certification...');
                      try {
                        const url = await uploadFile(file, 'certifications');
                        // Use functional updater so we never overwrite text fields typed after file was picked
                        setNewItem(prev => ({ ...prev, file: file.name, fileUrl: url }));
                        toast.success('File securely uploaded', { id: toastId });
                      } catch (err) {
                        console.error('Cert upload error:', err);
                        toast.error(err?.response?.data?.error || 'File upload failed', { id: toastId });
                      }
                    }} className="flex-1 bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-[#00c477] file:text-black hover:file:bg-[#00ff9d] cursor-pointer" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={async () => {
                      if (!newItem.title) {
                        toast.error('Certification Name is required');
                        return;
                      }
                      // Build updated list synchronously — don't rely on React state batching
                      const newCert = {
                        title: newItem.title,
                        provider: newItem.provider,
                        certNumber: newItem.certNumber,
                        file: newItem.file,
                        fileUrl: newItem.fileUrl,
                      };
                      const updatedCerts = [...form.certifications, newCert];
                      setForm(prev => ({ ...prev, certifications: updatedCerts }));
                      setNewItem({});
                      setEditMode(prev => ({ ...prev, certifications: false }));
                      const toastId = toast.loading('Saving certification...');
                      try {
                        await api.put('/hacker-profiles/me', {
                          bio: form.bio,
                          primarySkills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
                          certifications: updatedCerts.map(c => JSON.stringify({
                            title: c.title, provider: c.provider,
                            certNumber: c.certNumber, file: c.file, fileUrl: c.fileUrl,
                          })),
                        });
                        toast.success('Certification saved!', { id: toastId });
                      } catch (err) {
                        toast.error(err?.response?.data?.message || 'Failed to save', { id: toastId });
                      }
                    }} className="px-4 py-1.5 bg-[#00c477] text-black text-sm rounded-full font-bold">Add &amp; Save</button>
                    <button onClick={() => toggleEdit('certifications')} className="px-4 py-1.5 bg-white/10 text-white text-sm rounded-full font-bold hover:bg-white/20">Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-6">
                {form.certifications.length > 0 ? form.certifications.map((cert, idx) => (
                  <div key={idx} className="flex gap-4 group/item relative border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex flex-col items-center justify-center shrink-0 border border-white/10">
                      <FiAward size={20} className="text-[#00c477]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{cert.title}</h3>
                      {cert.provider && <p className="text-sm text-gray-400">Provider: {cert.provider}</p>}
                      {cert.certNumber && <p className="text-sm text-gray-400">Cert. Number: {cert.certNumber}</p>}
                      {cert.file && <p className="text-xs text-[#00c477] mt-1 flex items-center gap-1"><FiFolder size={12} /> Attached: {cert.file}</p>}
                    </div>
                    <button onClick={() => setForm({ ...form, certifications: form.certifications.filter((_, i) => i !== idx) })} className="absolute top-0 right-0 hidden group-hover/item:flex w-8 h-8 rounded-full bg-red-500/10 text-red-500 items-center justify-center hover:bg-red-500 hover:text-white">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No items added.</p>
                )}
              </div>
            </div>

            {/* Employment History */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 lg:p-8 relative group">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Employment history</h2>
                <button onClick={() => toggleEdit('employment')} className="w-8 h-8 rounded-full border border-[#00c477] flex items-center justify-center hover:bg-[#00c477]/10 text-[#00c477] opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiPlus size={16} />
                </button>
              </div>

              {editMode.employment ? (
                <div className="space-y-3 border-b border-white/5 pb-4 mb-4">
                  <input type="text" placeholder="Company Name" value={newItem.company || ''} onChange={e => setNewItem({ ...newItem, company: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <input type="text" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="From (e.g. Jan 2020)" value={newItem.from || ''} onChange={e => setNewItem({ ...newItem, from: e.target.value })} className="w-1/2 bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                    <input type="text" placeholder="To (e.g. Present)" value={newItem.to || ''} onChange={e => setNewItem({ ...newItem, to: e.target.value })} className="w-1/2 bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => {
                      if (newItem.company || newItem.title) {
                        setForm({ ...form, employment: [...form.employment, { company: newItem.company, title: newItem.title, from: newItem.from, to: newItem.to }] });
                      }
                      toggleEdit('employment');
                    }} className="px-4 py-1.5 bg-[#00c477] text-black text-sm rounded-full font-bold">Add & Done</button>
                    <button onClick={() => toggleEdit('employment')} className="px-4 py-1.5 bg-white/10 text-white text-sm rounded-full font-bold hover:bg-white/20">Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-6">
                {form.employment.length > 0 ? form.employment.map((job, idx) => (
                  <div key={idx} className="group/item relative border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <h3 className="font-bold text-lg">{job.title} {job.company ? `| ${job.company}` : ''}</h3>
                    {(job.from || job.to) && <p className="text-sm text-gray-400 mb-2">{job.from} - {job.to}</p>}
                    <button onClick={() => setForm({ ...form, employment: form.employment.filter((_, i) => i !== idx) })} className="absolute top-0 right-0 hidden group-hover/item:flex w-8 h-8 rounded-full bg-red-500/10 text-red-500 items-center justify-center hover:bg-red-500 hover:text-white">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No items added.</p>
                )}
              </div>
            </div>

            {/* Other Experiences */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 lg:p-8 relative group">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Other experiences</h2>
                <button onClick={() => toggleEdit('other')} className="w-8 h-8 rounded-full border border-[#00c477] flex items-center justify-center hover:bg-[#00c477]/10 text-[#00c477] opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiPlus size={16} />
                </button>
              </div>

              {editMode.other ? (
                <div className="space-y-3 border-b border-white/5 pb-4 mb-4">
                  <input type="text" placeholder="Subject or Name" value={newItem.subject || ''} onChange={e => setNewItem({ ...newItem, subject: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none" />
                  <textarea placeholder="Description" value={newItem.description || ''} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none resize-none min-h-[80px]" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Upload Photo/File:</span>
                    <input type="file" accept="image/*,.pdf" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const toastId = toast.loading('Uploading experience doc...');
                      try {
                        const url = await uploadFile(file, 'other');
                        // Use functional updater so we never overwrite text fields typed after file was picked
                        setNewItem(prev => ({ ...prev, file: file.name, fileUrl: url }));
                        toast.success('Document uploaded', { id: toastId });
                      } catch (err) {
                        console.error('Experience upload error:', err);
                        toast.error(err?.response?.data?.error || 'Upload failed', { id: toastId });
                      }
                    }} className="flex-1 bg-[#111] border border-[#00c477] rounded-lg p-2 text-sm focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-[#00c477] file:text-black hover:file:bg-[#00ff9d] cursor-pointer" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => {
                      if (newItem.subject || newItem.description) {
                        setForm({ ...form, other: [...form.other, { subject: newItem.subject, description: newItem.description, file: newItem.file, fileUrl: newItem.fileUrl }] });
                      }
                      toggleEdit('other');
                    }} className="px-4 py-1.5 bg-[#00c477] text-black text-sm rounded-full font-bold">Add & Done</button>
                    <button onClick={() => toggleEdit('other')} className="px-4 py-1.5 bg-white/10 text-white text-sm rounded-full font-bold hover:bg-white/20">Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {form.other.length > 0 ? form.other.map((exp, idx) => (
                  <div key={idx} className="group/item relative border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <h3 className="font-bold text-lg text-white mb-1">{exp.subject}</h3>
                    <p className="text-sm text-gray-300 pr-10">{exp.description}</p>
                    {exp.file && <p className="text-xs text-[#00c477] mt-2 flex items-center gap-1"><FiFolder size={12} /> Attached: {exp.file}</p>}
                    <button onClick={() => setForm({ ...form, other: form.other.filter((_, i) => i !== idx) })} className="absolute top-0 right-0 hidden group-hover/item:flex w-8 h-8 rounded-full bg-red-500/10 text-red-500 items-center justify-center hover:bg-red-500 hover:text-white">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center text-center py-6 text-gray-500">
                    <FiFolder size={40} className="text-[#00c477] mb-4" />
                    <p className="text-sm font-semibold text-white mb-1">Add any other experiences that help you stand out</p>
                    <button onClick={() => toggleEdit('other')} className="text-sm text-[#00c477] hover:underline">Add an experience</button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky footer with Next button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="max-w-[1200px] w-full px-4 pointer-events-auto">
          <div className="flex justify-end">
            <button
              onClick={async () => {
                await saveProfile();
                navigate('/national-id-verification');
              }}
              className="px-6 py-3 bg-[#00c477] text-black rounded-full font-bold shadow-lg hover:opacity-95"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HackerProfile;
