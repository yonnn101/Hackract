import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import { uploadFile as uploadChatFile } from '../api/chatApi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/authContext.jsx';
import invitationService from '../services/invitation.service';
import {
  FiArrowLeft, FiStar, FiMapPin, FiShield, FiTool,
  FiAward, FiBriefcase, FiMessageSquare, FiCheckCircle,
  FiActivity, FiZap, FiCpu, FiTarget, FiUsers, FiLock,
  FiTrendingUp, FiCalendar, FiGlobe, FiAlertTriangle, FiFolder,
  FiEdit2,
} from 'react-icons/fi';


// ─── DATA NORMALISER ─────────────────────────────────────────────────────────
// Converts the DB response into the shape the UI sections expect.
const normalise = (profile) => {
  if (!profile) return null;
  const u = profile.user || {};

  // Merge led + collaborated projects, de-dup by id
  const led = (u.pentestsLed || []).map(p => ({ ...p, role: 'Lead' }));
  const collab = (u.pentestCollaborators || []).map(c => ({ ...c.pentest, role: 'Collaborator' }));
  const seen = new Set();
  const projects = [...led, ...collab]
    .filter(p => p && p.id && !seen.has(p.id) && seen.add(p.id))
    .map(p => ({
      id: p.id,
      org: p.organization?.name || '[Confidential]',
      year: new Date(p.createdAt).toLocaleDateString('en-US'),
      title: p.name,
      status: p.status,
      role: p.role,
      organizationId: p.organizationId,
    }));

  const reviews = (u.reviewsReceived || []).map(r => ({
    id: r.id,
    fromId: r.author?.id,
    from: r.author?.fullName || r.author?.handle || 'Anonymous',
    rating: r.rating,
    text: r.comment || '',
    date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    project: r.pentest?.name || null,
    pentestId: r.pentest?.id || '',
  }));

  const skills = profile.primarySkills || [];

  // Parse JSON strings for certifications, education, etc.
  const certs = (profile.certifications || []).map(c => {
    try {
      const parsed = JSON.parse(c);
      return { name: parsed.title || parsed.name, body: parsed.provider || 'Verified Cert', verified: true, ...parsed };
    } catch {
      return { name: c, body: 'Verified Cert', verified: true };
    }
  });

  const education = (profile.education || []).map(e => {
    try {
      const parsed = JSON.parse(e);
      return { school: parsed.school, degree: parsed.degree, year: parsed.to || parsed.from || '', ...parsed };
    } catch {
      return { school: e, degree: 'Degree', year: '' };
    }
  });

  const employment = (profile.employment || []).map(e => {
    try {
      const parsed = JSON.parse(e);
      return { company: parsed.company, title: parsed.title, year: `${parsed.from} - ${parsed.to}`, ...parsed };
    } catch {
      return { company: e, title: 'Professional', year: '' };
    }
  });

  const other = (profile.otherExperiences || []).map(o => {
    try {
      const parsed = JSON.parse(o);
      return { subject: parsed.subject, description: parsed.description, ...parsed };
    } catch {
      return { subject: o, description: '' };
    }
  });

  const trustScore = u.trustScore ?? 100;
  const rank = trustScore >= 95 ? 'ELITE' : trustScore >= 85 ? 'PLATINUM' : trustScore >= 70 ? 'GOLD' : 'SILVER';

  return {
    id: profile.id,
    userId: profile.userId,
    name: u.fullName || 'Unknown Hacker',
    alias: u.fullName || '',
    tag: u.handle ? `@${u.handle}` : '',
    status: 'ACTIVE SENTINEL',
    rating: u.averageRating != null && u.totalReviews > 0
      ? +Number(u.averageRating).toFixed(1)
      : (reviews.length > 0
        ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : 0),
    totalReviews: u.totalReviews || reviews.length,
    rank,
    trustScore,
    location: profile.country || 'Remote',
    avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.handle}&baseColor=00ff88`,
    bio: profile.bio || '',
    arsenal: skills,
    skills,
    certifications: certs,
    specialization: profile.specialization || '',
    yearsOfExperience: profile.yearsOfExperience || 0,
    portfolioLinks: profile.portfolioLinks || [],
    github: profile.githubUsername,
    linkedin: profile.linkedinProfile,
    twitter: profile.twitter,
    telemetry: {
      vulnsFound: 0,
      uptimeIntegrity: `${trustScore}%`,
    },
    projects,
    reviews,
    education,
    employment,
    other,
    isIdVerified: u.nationalIDVerification?.verificationStatus === 'APPROVED',
  };
};

const TAB_ICONS = {
  ABOUT: FiActivity,
  "SKILLS & TOOLS": FiTool,
  CERTIFICATIONS: FiAward,
  "OTHER": FiCpu,
  "PAST PROJECTS": FiBriefcase,
  REVIEWS: FiMessageSquare,
};

const TABS = ["ABOUT", "SKILLS & TOOLS", "CERTIFICATIONS", "PAST PROJECTS", "REVIEWS"];

const RANK_COLORS = {
  ELITE: { text: "text-purple-400", border: "border-purple-400/30", bg: "bg-purple-400/10" },
  PLATINUM: { text: "text-blue-300", border: "border-blue-300/30", bg: "bg-blue-300/10" },
  GOLD: { text: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10" },
  SILVER: { text: "text-gray-300", border: "border-gray-400/30", bg: "bg-gray-400/10" },
};

// ─── SECTION COMPONENTS ───────────────────────────────────────────────────────

const AboutSection = ({ hacker }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    {/* Bio Section */}
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
          <FiActivity className="text-[#00c477] text-sm" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">Dossier Overview</h2>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed mb-8">{hacker.bio || 'No bio provided.'}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


        {/* Active Arsenal */}
        <div>
          <p className="text-[9px] font-black text-gray-500 tracking-[0.3em] uppercase mb-4">Core Skillset</p>
          <div className="flex flex-wrap gap-2">
            {hacker.skills.map(t => (
              <span key={t} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-gray-300 font-mono hover:border-[#00c477]/30 transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Verification Status */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-500 tracking-[0.3em] uppercase mb-4">Verifications</p>
          <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
            <span className="text-xs text-gray-400 font-mono">National ID</span>
            {hacker.isIdVerified ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#00c477] uppercase tracking-wider">
                <FiCheckCircle /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                <FiLock /> Unverified
              </span>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
            <span className="text-xs text-gray-400 font-mono">Email Status</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#00c477] uppercase tracking-wider">
              <FiCheckCircle /> Confirmed
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Validated Credentials Preview */}
    {hacker.certifications.length > 0 && (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
            <FiShield className="text-[#00c477] text-sm" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Active Certifications</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hacker.certifications.map((cert, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[#00c477]/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center flex-shrink-0">
                <FiShield className="text-[#00c477]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{cert.name}</p>
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest truncate">{cert.provider || 'Credential'}</p>
              </div>
              {cert.verified && <FiCheckCircle className="text-[#00c477] text-lg flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Professional Experience */}
    {hacker.employment.length > 0 && (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
            <FiBriefcase className="text-[#00c477] text-sm" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Professional Experience</h2>
        </div>
        <div className="space-y-6">
          {hacker.employment.map((job, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <FiBriefcase className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{job.title}</p>
                <p className="text-xs text-[#00c477] font-mono mt-0.5">{job.company}</p>
                <p className="text-[10px] text-gray-600 font-mono mt-1">{job.year}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Academic Background */}
    {hacker.education.length > 0 && (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
            <FiAward className="text-[#00c477] text-sm" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Academic Background</h2>
        </div>
        <div className="space-y-6">
          {hacker.education.map((edu, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <FiActivity className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{edu.degree}</p>
                <p className="text-xs text-gray-400 mt-0.5">{edu.school}</p>
                <p className="text-[10px] text-gray-600 font-mono mt-1">{edu.from} — {edu.to}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Engagement Log Preview */}
    {hacker.projects.length > 0 && (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
            <FiBriefcase className="text-[#00c477] text-sm" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Engagement Log</h2>
        </div>
        <div className="space-y-4">
          {hacker.projects.map((p, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <FiBriefcase className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{p.org} — {p.year}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{p.title}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-[9px] font-black font-mono tracking-widest uppercase text-[#00c477] bg-[#00c477]/10 border border-[#00c477]/20 flex-shrink-0">
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

const SkillsSection = ({ hacker }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
          <FiTool className="text-[#00c477] text-sm" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">Core Skill Set</h2>
      </div>
      <div className="space-y-4">
        {hacker.skills.map((skill, i) => (
          <div key={skill}>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-300 font-mono">{skill}</span>
              <span className="text-xs text-[#00c477] font-mono">{95 - i * 5}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00c477] to-emerald-400 rounded-full shadow-[0_0_8px_rgba(0,196,119,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${95 - i * 5}%` }}
                transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
          <FiCpu className="text-[#00c477] text-sm" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">Active Toolchain</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {hacker.arsenal.map((tool) => (
          <div key={tool} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[#00c477]/20 hover:bg-[#00c477]/5 transition-all group">
            <div className="w-2 h-2 rounded-full bg-[#00c477] shadow-[0_0_6px_#00c477] flex-shrink-0" />
            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors font-mono truncate">{tool}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const CertificationsSection = ({ hacker }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
          <FiAward className="text-[#00c477] text-sm" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">Certifications & Credentials</h2>
      </div>
      {hacker.certifications.length === 0 ? (
        <p className="text-gray-600 text-sm font-mono">No certifications on record.</p>
      ) : (
        <div className="space-y-4">
          {hacker.certifications.map((cert, i) => (
            <motion.div
              key={cert.name || i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#00c477]/20 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center flex-shrink-0">
                  <FiShield className="text-[#00c477] text-2xl" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white">{cert.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    {cert.provider && (
                      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                        Provider: <span className="text-gray-400">{cert.provider}</span>
                      </span>
                    )}
                    {cert.number && (
                      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                        ID: <span className="text-gray-400">{cert.number}</span>
                      </span>
                    )}
                  </div>
                </div>
                {cert.verified && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00c477]/20 bg-[#00c477]/10">
                    <FiCheckCircle className="text-[#00c477] text-sm" />
                    <span className="text-[9px] font-black text-[#00c477] font-mono tracking-widest uppercase">Verified</span>
                  </div>
                )}
              </div>

              {cert.fileUrl && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase mb-3">Attachment</p>
                  <div className="flex items-center gap-3">
                    {cert.fileUrl.match(/\.(jpeg|jpg|gif|png|svg)$/i) ? (
                      <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="block w-full">
                        <img src={cert.fileUrl} alt={cert.name} className="w-full max-h-48 object-contain rounded-xl border border-white/10 bg-black/50" />
                      </a>
                    ) : (
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#00c477]/30 transition-all w-full group"
                      >
                        <FiFolder className="text-gray-500 group-hover:text-[#00c477]" />
                        <span className="text-xs text-gray-400 group-hover:text-gray-200 truncate">{cert.file || 'View Document'}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

const ProjectsSection = ({ hacker }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
          <FiBriefcase className="text-[#00c477] text-sm" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">Past Engagements</h2>
      </div>
      {hacker.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
            <FiLock className="text-gray-600 text-2xl" />
          </div>
          <p className="text-gray-600 text-sm font-mono">Engagement history is classified.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hacker.projects.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-5 p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center flex-shrink-0">
                <FiBriefcase className="text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{p.org}</span>
                  <span className="text-[10px] text-gray-600 font-mono">— {p.year}</span>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

const OtherExperiencesSection = ({ hacker }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
          <FiCpu className="text-[#00c477] text-sm" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">Additional Experiences</h2>
      </div>
      <div className="space-y-6">
        {hacker.other.map((exp, i) => (
          <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-base font-bold text-white mb-2">{exp.subject}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">{exp.description}</p>
            {exp.fileUrl && (
              <div className="flex items-center gap-3">
                <a
                  href={exp.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#00c477]/30 transition-all group"
                >
                  <FiFolder className="text-gray-500 group-hover:text-[#00c477]" />
                  <span className="text-xs text-gray-400 group-hover:text-gray-200">{exp.file || 'View Attachment'}</span>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const ReviewsSection = ({ hacker, isOrgAdmin, user, onSubmitReview }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedPentestId, setSelectedPentestId] = useState('');
  const [editingReview, setEditingReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const existingReview = hacker.reviews?.find(r => r.fromId === user?.id);

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating || 5);
      setComment(editingReview.text || '');
      setSelectedPentestId(editingReview.pentestId || '');
    } else {
      setRating(5);
      setComment('');
      setSelectedPentestId('');
    }
  }, [editingReview]);

  const userOrgIds = user?.organizations?.map(org => org.organizationId) || [];
  const orgProjects = (hacker.projects || []).filter(proj => userOrgIds.includes(proj.organizationId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitReview({ rating, comment, pentestId: selectedPentestId || null });
      setEditingReview(null);
    } catch (err) {
      // Error handled by parent toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Reviews List */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
              <FiMessageSquare className="text-[#00c477] text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Client Reviews</h2>
              {existingReview && isOrgAdmin && (
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] mt-1 font-mono">
                  Your organization’s rating can be edited by clicking the pencil icon.
                </p>
              )}
            </div>
          </div>
          {isOrgAdmin && (
            <button
              type="button"
              onClick={() => setEditingReview(existingReview || { rating: 5, text: '', pentestId: '' })}
              className="inline-flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.25em] bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition"
            >
              <FiEdit2 className="text-[#00c477]" />
              {existingReview ? 'Edit Your Review' : 'Leave Review'}
            </button>
          )}
        </div>
        {hacker.reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
              <FiMessageSquare className="text-gray-600 text-2xl" />
            </div>
            <p className="text-gray-600 text-sm font-mono">No reviews available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hacker.reviews.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{r.from}</p>
                      {r.project && (
                        <span className="px-2 py-0.5 rounded bg-[#00c477]/10 border border-[#00c477]/20 text-[9px] text-[#00c477] font-mono">
                          Project: {r.project}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {[...Array(5)].map((_, j) => (
                        <FiStar key={j} className={`text-xs ${j < r.rating ? 'text-[#00c477] fill-[#00c477]' : 'text-gray-700'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 font-mono">{r.date}</span>
                    {isOrgAdmin && r.fromId === user?.id && (
                      <button
                        type="button"
                        onClick={() => setEditingReview(r)}
                        className="p-2 rounded-full text-gray-400 hover:text-[#00c477] transition"
                        aria-label="Edit your review"
                      >
                        <FiEdit2 className="text-base" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed font-sans">"{r.text}"</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {editingReview && isOrgAdmin && (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00c477]/5 rounded-full blur-2xl" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
              <FiStar className="text-[#00c477] text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">{editingReview?.id ? 'Edit Your Review' : 'Leave a Review'}</h2>
              <p className="text-xs text-gray-400 uppercase tracking-[0.25em] mt-1 font-mono">
                Update your rating for this pentester.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Rating Stars Input */}
            <div>
              <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block mb-3 font-mono">
                Overall Assessment
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform active:scale-95 text-2xl animate-pulse-subtle"
                  >
                    <FiStar
                      className={`transition-all duration-150 ${
                        star <= (hoverRating || rating)
                          ? 'text-[#00c477] fill-[#00c477] scale-110 drop-shadow-[0_0_8px_rgba(0,196,119,0.4)]'
                          : 'text-gray-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-gray-400 font-mono ml-2">
                  ({rating} of 5 stars)
                </span>
              </div>
            </div>

            {orgProjects.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block mb-2 font-mono">
                  Related Engagement
                </label>
                <select
                  value={selectedPentestId}
                  onChange={(e) => setSelectedPentestId(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00c477]/40 transition-all"
                >
                  <option value="">Select an engagement</option>
                  {orgProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.org} — {project.year}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block mb-2 font-mono">
                Detailed Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave structured feedback regarding communication, performance, or technical expertise..."
                required
                className="w-full bg-[#0c0c0c] border border-white/5 focus:border-[#00c477]/40 focus:ring-1 focus:ring-[#00c477]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all resize-none h-28"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-[#00c477] hover:bg-[#009a5e] text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,196,119,0.15)] hover:shadow-[0_0_30px_rgba(0,196,119,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Submitting...' : editingReview?.id ? 'Update Evaluation' : 'Submit Evaluation'}
              </button>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="px-5 py-3 rounded-xl border border-white/10 text-white text-xs uppercase tracking-widest hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const HackerPublicProfile = () => {
  const { hackerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOrgAdmin = user?.roles?.some(r => (typeof r === 'string' ? r : r.type) === 'ORG_ADMIN') ||
                     user?.organizations?.some(org => org.role === 'admin' || org.role === 'owner') ||
                     false;

  const [activeTab, setActiveTab] = useState('ABOUT');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [hacker, setHacker] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSubmitReview = async ({ rating, comment, pentestId }) => {
    try {
      await api.post(`/hacker-profiles/public/${hackerId}/reviews`, {
        rating,
        comment,
        pentestId,
      });
      toast.success('Your review has been successfully submitted!');
      // Reload profile data to immediately show updated average rating and new review
      const profileRes = await api.get(`/hacker-profiles/public/${hackerId}`);
      const updatedProfile = profileRes.data?.data?.profile || profileRes.data?.profile || profileRes.data;
      setHacker(normalise(updatedProfile));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit review');
      throw err;
    }
  };
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [agreementMode, setAgreementMode] = useState('UPLOAD');
  const [agreementFile, setAgreementFile] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState('');
  const [agreementLoading, setAgreementLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/hacker-profiles/public/${hackerId}`);
        const profile = data?.data?.profile || data?.profile || data;
        setHacker(normalise(profile));

        // Load organization projects for invitation
        const organizationId = user?.organizations?.[0]?.organizationId || user?.organizations?.[0]?.organization?.id;
        const projRes = organizationId 
          ? await api.get(`/pentests?organizationId=${organizationId}`)
          : await api.get('/pentests');
        setProjects(projRes.data?.data || projRes.data?.pentests || []);
      } catch (err) {
        console.error('Failed to load hacker profile', err);
        toast.error('Hacker profile not found');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [hackerId, navigate, user]);

  useEffect(() => {
    const loadAgreements = async () => {
      try {
        const { data } = await api.get('/legal-agreements?isActive=true');
        const list = data?.data || data || [];
        setAgreements(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load legal agreements', err);
        setAgreements([]);
      }
    };
    loadAgreements();
  }, []);

  const buildAgreementFile = (agreement) => {
    const rawTitle = agreement?.title || 'agreement';
    const safeTitle = rawTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'agreement';
    const version = agreement?.version ? `v${agreement.version}` : 'v1';
    const fileName = `${safeTitle}_${version}.txt`;
    const content = agreement?.content || '';
    return new File([content], fileName, { type: 'text/plain' });
  };

  const handleSendInvitation = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }
    if (agreementMode === 'UPLOAD' && !agreementFile) {
      toast.error('Please upload a legal agreement file');
      return;
    }
    if (agreementMode === 'LEGAL_AGREEMENT' && !selectedAgreementId) {
      toast.error('Please select a legal agreement');
      return;
    }
    setInviting(true);
    try {
      setAgreementLoading(true);

      const projectRes = await api.get(`/projects/${selectedProject}`);
      const projectData = projectRes?.data?.data || projectRes?.data || {};
      const collaborators = projectData?.collaborators || [];
      const alreadyAssigned = collaborators.some((c) => c.userId === hacker.userId);
      if (alreadyAssigned) {
        toast.error('This hacker is already assigned to the selected project.');
        return;
      }

      const inviteRes = await invitationService.getInvitationsByProject(selectedProject);
      const inviteList = Array.isArray(inviteRes?.data)
        ? inviteRes.data
        : Array.isArray(inviteRes?.data?.data)
          ? inviteRes.data.data
          : [];
      const pendingInvite = inviteList.find((inv) => inv.status === 'PENDING' && (inv.hackerId === hacker.userId || inv.hacker?.id === hacker.userId));
      if (pendingInvite) {
        toast.error('This hacker already has a pending invitation for the selected project.');
        return;
      }

      let agreementPayload = null;

      if (agreementMode === 'UPLOAD') {
        const fileData = await uploadChatFile(agreementFile);
        agreementPayload = {
          source: 'UPLOAD',
          title: agreementFile?.name,
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileMime: fileData.fileMime,
        };
      } else {
        const agreement = agreements.find((a) => a.id === selectedAgreementId);
        if (!agreement?.content) {
          toast.error('Selected agreement is missing content.');
          return;
        }
        const generatedFile = buildAgreementFile(agreement);
        const fileData = await uploadChatFile(generatedFile);
        agreementPayload = {
          source: 'LEGAL_AGREEMENT',
          legalAgreementId: agreement.id,
          title: agreement.title,
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileMime: fileData.fileMime,
        };
      }

      await api.post('/invitations', {
        pentestId: selectedProject,
        hackerId: hacker.userId,
        message: inviteMessage.trim() || undefined,
        agreement: agreementPayload,
      });
      toast.success(`Invitation sent to ${hacker.name}!`);
      setAssignModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send invitation');
    } finally {
      setAgreementLoading(false);
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-[#00c477]/20 border-t-[#00c477] rounded-full animate-spin" />
        <div className="text-[#00c477] font-mono text-xs uppercase animate-pulse tracking-widest">Accessing Dossier...</div>
      </div>
    );
  }

  if (!hacker) return null;

  const rankStyle = RANK_COLORS[hacker.rank] || RANK_COLORS.SILVER;
  const agreementReady = agreementMode === 'UPLOAD' ? !!agreementFile : !!selectedAgreementId;
  const isSending = inviting || agreementLoading;

  const renderSection = () => {
    switch (activeTab) {
      case "ABOUT": return <AboutSection hacker={hacker} />;
      case "SKILLS & TOOLS": return <SkillsSection hacker={hacker} />;
      case "CERTIFICATIONS": return <CertificationsSection hacker={hacker} />;
      case "OTHER": return <OtherExperiencesSection hacker={hacker} />;
      case "PAST PROJECTS": return <ProjectsSection hacker={hacker} />;
      case "REVIEWS": return <ReviewsSection hacker={hacker} isOrgAdmin={isOrgAdmin} user={user} onSubmitReview={handleSubmitReview} />;
      default: return <AboutSection hacker={hacker} />;
    }
  };

  const dynamicTabs = ["ABOUT"];
  if (hacker.skills.length > 0) dynamicTabs.push("SKILLS & TOOLS");
  if (hacker.certifications.length > 0) dynamicTabs.push("CERTIFICATIONS");
  if (hacker.other.length > 0) dynamicTabs.push("OTHER");
  if (hacker.projects.length > 0) dynamicTabs.push("PAST PROJECTS");
  if (hacker.reviews.length > 0 || isOrgAdmin) dynamicTabs.push("REVIEWS");

  return (
    <div className="flex flex-col h-full -m-10">

      <div className="relative px-10 py-6 border-b border-white/5 bg-[#050505] overflow-hidden">
        {/* subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00c477]/5 rounded-full blur-3xl" />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#00c477] transition-colors mb-6 group"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-mono uppercase tracking-widest">Back to Discover</span>
        </button>

        <div className="flex items-center justify-between gap-6">
          {/* Avatar + Identity */}
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00c477]/20 to-emerald-900/40 p-0.5 border border-[#00c477]/30 shadow-[0_0_20px_rgba(0,196,119,0.15)]">
                <img
                  src={hacker.avatar}
                  alt={hacker.name}
                  className="w-full h-full rounded-xl object-cover bg-black/50"
                />
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00c477] border-2 border-[#050505] shadow-[0_0_10px_#00c477] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            </div>

            {/* Identity info */}
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-0.5">{hacker.name}</h1>
              <p className="text-xs text-gray-500 font-mono mb-2">{hacker.tag}</p>

              {hacker.rating != null && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/5 w-fit">
                  <FiStar className="text-[#00c477] fill-[#00c477] text-xs" />
                  <span className="text-white font-bold text-xs">{hacker.rating}</span>
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    Rating ({hacker.totalReviews || 0} {hacker.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assign to Project button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setAssignModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-[#00c477] hover:bg-[#009a5e] text-black font-black text-sm rounded-xl shadow-[0_0_20px_rgba(0,196,119,0.2)] hover:shadow-[0_0_35px_rgba(0,196,119,0.4)] transition-all"
          >
            <FiBriefcase className="text-lg" />
            Assign to Project
          </motion.button>
        </div>


      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar: Tabs + System Telemetry */}
        <aside className="w-72 border-r border-white/5 bg-[#050505] flex flex-col overflow-y-auto">

          {/* Tab nav */}
          <nav className="p-4 space-y-1 flex-1">
            {dynamicTabs.map((tab) => {
              const Icon = TAB_ICONS[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-all group relative ${isActive
                    ? 'bg-[#00c477]/10 border border-[#00c477]/20 text-[#00c477]'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`text-base ${isActive ? 'text-[#00c477]' : 'group-hover:text-gray-300'}`} />
                    <span className="text-[11px] font-black tracking-[0.15em] uppercase font-mono">{tab}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#00c477] shadow-[0_0_6px_#00c477]" />}
                </button>
              );
            })}
          </nav>


        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#050505]">
          <AnimatePresence mode="wait">
            <div key={activeTab}>
              {renderSection()}
            </div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Assign to Project Modal ── */}
      <AnimatePresence>
        {assignModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setAssignModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
                  <FiBriefcase className="text-[#00c477] text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Assign to Project</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">Invite {hacker.name} to collaborate</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No active projects found.</p>
                ) : (
                  projects.map((project) => (
                    <label
                      key={project.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all group ${selectedProject === project.id
                        ? 'border-[#00c477] bg-[#00c477]/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-[#00c477]/20'
                        }`}
                      onClick={() => setSelectedProject(project.id)}
                    >
                      <div className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center ${selectedProject === project.id ? 'border-[#00c477]' : 'border-white/20'
                        }`}>
                        {selectedProject === project.id && <div className="w-2 h-2 rounded-full bg-[#00c477]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${selectedProject === project.id ? 'text-white' : 'text-gray-300'}`}>
                          {project.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{project.status}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="mb-6">
                <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block mb-3 font-mono">
                  Agreement Source
                </label>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setAgreementMode('UPLOAD')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${agreementMode === 'UPLOAD'
                      ? 'border-[#00c477]/50 text-[#00c477] bg-[#00c477]/10'
                      : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => setAgreementMode('LEGAL_AGREEMENT')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${agreementMode === 'LEGAL_AGREEMENT'
                      ? 'border-[#00c477]/50 text-[#00c477] bg-[#00c477]/10'
                      : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}
                  >
                    Use Existing
                  </button>
                </div>

                {agreementMode === 'UPLOAD' ? (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#00c477]/10 file:text-[#00c477] file:font-bold file:uppercase file:text-[10px] file:tracking-widest hover:file:bg-[#00c477]/20"
                    />
                    {agreementFile && (
                      <p className="text-[11px] text-gray-500 mt-2 font-mono truncate">{agreementFile.name}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedAgreementId}
                      onChange={(e) => setSelectedAgreementId(e.target.value)}
                      className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    >
                      <option value="">Select a legal agreement</option>
                      {agreements.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} {a.version ? `v${a.version}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <textarea
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  placeholder="Personal invitation message..."
                  className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none h-24"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitation}
                  disabled={isSending || !selectedProject || !agreementReady}
                  className="flex-1 py-3 rounded-xl bg-[#00c477] hover:bg-[#009a5e] text-black font-black text-sm shadow-[0_0_20px_rgba(0,196,119,0.2)] hover:shadow-[0_0_35px_rgba(0,196,119,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                  {isSending ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HackerPublicProfile;
