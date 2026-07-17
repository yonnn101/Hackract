import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import SignaturePad from '../components/SignaturePad';
import PentesterSigningPortal from '../components/PentesterSigningPortal';
import api from '../api/axiosConfig';
import { useAuth } from '../context/authContext';

const CLOSING_OPTIONS = ['Sincerely,', 'Best regards,', 'Yours truly,', 'Respectfully,', 'Warm regards,', 'Love,'];

const AGREEMENT_TYPE_OPTIONS = [
  { value: 'terms_of_service', label: 'Terms of Service' },
  { value: 'nda', label: 'NDA' },
  { value: 'privacy_policy', label: 'Privacy Policy' },
  { value: 'sla', label: 'SLA' },
  { value: 'other', label: 'Other' },
];

const todayFormatted = () =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const LETTER_MARKER_START = '<!-- LETTER_JSON';
const LETTER_MARKER_END = 'END_LETTER -->';

const parseLetter = (content) => {
  if (!content) return null;
  const start = content.indexOf(LETTER_MARKER_START);
  const end = content.indexOf(LETTER_MARKER_END);
  if (start === -1 || end === -1) return null;
  try {
    const json = content.slice(start + LETTER_MARKER_START.length, end).trim();
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const stripLetter = (content) => {
  if (!content) return '';
  const start = content.indexOf(LETTER_MARKER_START);
  const end = content.indexOf(LETTER_MARKER_END);
  if (start === -1 || end === -1) return content;
  return (content.slice(0, start) + content.slice(end + LETTER_MARKER_END.length)).trim();
};

const renderLetterText = (letter) => {
  const header = [letter.sender_name, letter.sender_address, letter.date]
    .filter(Boolean)
    .join('\n');
  const greeting = letter.recipient_name ? `Dear ${letter.recipient_name},` : '';
  const closing = [letter.closing, letter.signer_name].filter(Boolean).join('\n');

  return [header, greeting, letter.body, closing]
    .filter((part) => part && part.trim())
    .join('\n\n');
};

const sanitizeFileName = (value) => value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

const buildAgreementPdf = ({ title, content, filename, watermark }) => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  let cursorY = margin;

  const drawWatermark = () => {
    if (!watermark) return;
    pdf.saveGraphicsState?.();
    pdf.setTextColor(236, 236, 236);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(54);
    pdf.text(watermark, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 315,
    });
    pdf.restoreGraphicsState?.();
  };

  drawWatermark();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  pdf.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 24;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 24;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  const paragraphs = String(content || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const lines = pdf.splitTextToSize(paragraph, maxWidth);
    const blockHeight = lines.length * lineHeight + 10;

    if (cursorY + blockHeight > pageHeight - margin) {
      pdf.addPage();
      drawWatermark();
      cursorY = margin;
    }

    pdf.text(lines, margin, cursorY);
    cursorY += blockHeight;
  }

  pdf.save(filename);
};

const formatAgreementType = (value) => AGREEMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Agreement';

const MotionDiv = motion.div;

const serializeLetter = (letter) => {
  const text = renderLetterText(letter);
  const block = `\n\n${LETTER_MARKER_START}\n${JSON.stringify(letter, null, 2)}\n${LETTER_MARKER_END}`;
  return `${text}${block}`;
};

const emptyLetter = () => ({
  sender_name: '',
  sender_address: '',
  date: todayFormatted(),
  recipient_name: '',
  body: '',
  closing: 'Sincerely,',
  signer_name: '',
});

export default function AgreementExecute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const roleTypes = user?.roles?.map((r) => r.type) || [];
  if (typeof user?.role === 'string') roleTypes.push(user.role);
  const isOrg = roleTypes.some((r) => ['ORG_ADMIN', 'ORGANIZATION'].includes(r));

  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signatureData, setSignatureData] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [editableTitle, setEditableTitle] = useState('');
  const [agreementType, setAgreementType] = useState('terms_of_service');
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [letter, setLetter] = useState(emptyLetter());

  const updateLetter = (key, value) => setLetter((prev) => ({ ...prev, [key]: value }));
  const handleDownload = () => {
    const content = isOrg ? renderLetterText(letter) : (editableContent || agreement?.content || '');
    const title = editableTitle || agreement?.title || 'agreement';
    const fileName = `${sanitizeFileName(title) || 'agreement'}_v${agreement?.version || '1'}.pdf`;

    buildAgreementPdf({
      title,
      content,
      filename: fileName,
      watermark: isOrg ? formatAgreementType(agreementType).toUpperCase() : '',
    });
  };

  useEffect(() => {
    const fetchAgreement = async () => {
      try {
        if (id) {
          const [agreementRes, signedRes] = await Promise.all([
            api.get(`/legal-agreements/${id}`),
            api.get(`/user-signatures/check/${id}`).catch(() => ({ data: { signed: false } })),
          ]);
          setAgreement(agreementRes.data.data);
          const rawContent = agreementRes.data.data.content || '';
          const parsed = parseLetter(rawContent);
          setEditableContent(stripLetter(rawContent));
          setEditableTitle(agreementRes.data.data.title || '');
          setAgreementType(agreementRes.data.data.type || 'terms_of_service');
          setAlreadySigned(signedRes.data?.signed ?? false);
          if (parsed) setLetter({ ...emptyLetter(), ...parsed });
        } else {
          setAgreement({
            title: '',
            version: '1.0',
            createdAt: new Date().toISOString(),
            content: '',
          });
          setEditableContent('');
          setEditableTitle('');
          setAgreementType('terms_of_service');
          setLetter(emptyLetter());
        }
      } catch (err) {
        console.error('Failed to load agreement', err);
        toast.error('Could not load agreement details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgreement();
  }, [id]);

  const handleSubmit = async () => {
    if (isOrg) {
      if (!editableTitle.trim()) {
        toast.error('Please provide an agreement title.');
        return;
      }
      if (!letter.body.trim()) {
        toast.error('Please write the letter body.');
        return;
      }
    } else {
      if (!signatureData) {
        toast.error('Please provide your digital signature.');
        return;
      }
      if (!agreed) {
        toast.error('Please agree to the terms to proceed.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let currentId = id;

      if (isOrg) {
        const mergedContent = serializeLetter(letter);

        if (currentId) {
          await api.patch(`/legal-agreements/${currentId}`, {
            content: mergedContent,
            title: editableTitle,
            type: agreementType,
          });
        } else {
          const formData = new FormData();
          formData.append('title', editableTitle);
          formData.append('type', agreementType);
          formData.append('content', mergedContent);
          formData.append('version', agreement.version);
          formData.append('isActive', true);
          const blob = new Blob([mergedContent], { type: 'text/plain' });
          formData.append('file', blob, 'agreement.txt');

          const res = await api.post('/legal-agreements', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          currentId = res.data.data.id;
        }

        toast.success('Letter saved successfully.');
        setTimeout(() => navigate('/legal'), 1200);
        return;
      }

      if (currentId) {
        await api.post('/user-signatures/sign', {
          agreementId: currentId,
          signatureData,
        });
      }
      toast.success('Agreement executed successfully.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00c477] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!id && !isOrg) {
    return <PentesterSigningPortal />;
  }

  if (!agreement) return null;

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-[#00c477]/30">

      {/* ───────────── LEFT PANEL ───────────── */}
      <div className="w-full lg:w-1/2 flex flex-col border-r border-white/5 bg-[#0d0d0d] relative z-10 min-h-[500px]">

        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#00c477]/10 flex items-center justify-center text-[#00c477]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs font-mono font-bold text-[#00c477] tracking-widest">
              {isOrg ? 'LETTER_PREVIEW' : `AGREEMENT_V${agreement.version}.PDF`}
            </span>
            {isOrg && (
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono tracking-widest uppercase">
                LIVE PREVIEW
              </span>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-md hover:bg-white/5 transition-colors text-xs font-mono tracking-widest text-gray-400 hover:text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DOWNLOAD
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-12 custom-scrollbar">
          {isOrg ? (
            /* ─── Org: Live Letter Preview (paper) ─── */
            <div className="max-w-2xl mx-auto bg-[#fafaf5] text-[#1a1a1a] rounded-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] p-12 md:p-16 min-h-[calc(100vh-12rem)] font-serif relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="-rotate-45 text-[clamp(3rem,10vw,7rem)] font-black tracking-[0.3em] text-[#00c477]/10 uppercase whitespace-nowrap">
                  {formatAgreementType(agreementType)}
                </div>
              </div>
              {/* Title (subject) */}
              {editableTitle && (
                <div className="relative z-10 text-center mb-10 pb-6 border-b border-gray-200">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{editableTitle}</h1>
                </div>
              )}

              {/* Sender Block - right aligned */}
              <div className="relative z-10 text-right text-[15px] leading-relaxed mb-10 min-h-20">
                {letter.sender_name ? (
                  <p className="font-semibold">{letter.sender_name},</p>
                ) : (
                  <p className="text-gray-400 italic">Your Name,</p>
                )}
                {letter.sender_address ? (
                  <p className="font-semibold">{letter.sender_address},</p>
                ) : (
                  <p className="text-gray-400 italic">Your Address,</p>
                )}
                <p className="mt-4">
                  {letter.date || <span className="text-gray-400 italic">Date</span>}
                </p>
              </div>

              {/* Greeting */}
              <p className="relative z-10 text-[15px] mb-6">
                Dear{' '}
                {letter.recipient_name ? (
                  <span>{letter.recipient_name},</span>
                ) : (
                  <span className="text-gray-400 italic">(Recipient's Name),</span>
                )}
              </p>

              {/* Body */}
              <div className="relative z-10 text-[15px] leading-[1.9] space-y-5 min-h-32">
                {letter.body ? (
                  letter.body
                    .split(/\n{2,}/)
                    .map((p, i) => p.trim() && <p key={i} className="text-justify">{p.trim()}</p>)
                ) : (
                  <p className="text-gray-400 italic">Start writing your letter on the right →</p>
                )}
              </div>

              {/* Closing */}
              <div className="relative z-10 mt-12 text-[15px] leading-relaxed">
                <p className="font-semibold">{letter.closing || 'Sincerely,'}</p>
                <p className="mt-6 font-semibold">
                  {letter.signer_name || <span className="text-gray-400 italic font-normal">(Your Name)</span>}
                </p>
              </div>
            </div>
          ) : (
            /* ─── Pentester: Read agreement ─── */
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-serif font-bold text-white mb-2 leading-tight">{agreement.title}</h1>
              <p className="text-[10px] font-mono tracking-widest text-gray-500 mb-8 uppercase">
                EFFECTIVE DATE: {new Date(agreement.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="prose prose-invert prose-p:text-gray-400 prose-p:leading-relaxed prose-h2:text-white prose-h2:font-serif prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4">
                {editableContent.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.trim().match(/^\d+\./)) {
                    return <h2 key={idx}>{paragraph.trim()}</h2>;
                  }
                  if (paragraph.trim() === '') return null;
                  return <p key={idx}>{paragraph.trim()}</p>;
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ───────────── RIGHT PANEL ───────────── */}
      <div className="w-full lg:w-1/2 flex flex-col relative bg-[#0a0a0a] min-h-[500px]">

        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        <div className={`flex-1 flex flex-col ${isOrg ? 'justify-start py-10 overflow-y-auto custom-scrollbar' : 'justify-center'} px-12 lg:px-20 max-w-2xl mx-auto w-full z-10`}>

          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl font-bold text-white mb-2">
              {isOrg ? 'Compose Letter' : 'Execute Agreement'}
            </h2>
            <p className="text-xs font-mono text-gray-500 tracking-widest uppercase mb-10">
              {isOrg ? 'FRIENDLY LETTER FORMAT' : 'VERIFICATION PHASE: FINAL AUTHORIZATION'}
            </p>

            {alreadySigned && !isOrg && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 mb-6">
                <svg className="w-4 h-4 text-[#00c477] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-mono text-[#00c477] tracking-widest uppercase">You have already signed this agreement</span>
              </div>
            )}

            {isOrg ? (
              /* ─────────── ORG: Letter Composer ─────────── */
              <div className="space-y-5 mb-8">

                {/* Title / Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Letter Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    placeholder="e.g. Sample Letter To A Best Friend"
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Agreement Type</label>
                  <select
                    value={agreementType}
                    onChange={(e) => setAgreementType(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00c477]/50 transition-colors"
                  >
                    {AGREEMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] font-mono text-gray-600 tracking-wide">
                    The selected type is shown as a watermark on the preview and PDF.
                  </p>
                </div>

                <div className="h-px bg-white/5 my-6" />

                {/* Sender */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Your Name</label>
                    <input
                      type="text"
                      value={letter.sender_name}
                      onChange={(e) => updateLetter('sender_name', e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Your Address</label>
                    <input
                      type="text"
                      value={letter.sender_address}
                      onChange={(e) => updateLetter('sender_address', e.target.value)}
                      placeholder="123 Main Street, City"
                      className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Date</label>
                    <input
                      type="text"
                      value={letter.date}
                      onChange={(e) => updateLetter('date', e.target.value)}
                      placeholder={todayFormatted()}
                      className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="h-px bg-white/5 my-6" />

                {/* Recipient */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Recipient (Dear ___)</label>
                  <input
                    type="text"
                    value={letter.recipient_name}
                    onChange={(e) => updateLetter('recipient_name', e.target.value)}
                    placeholder="Jane"
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-colors"
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Letter Body <span className="text-red-400">*</span></label>
                  <textarea
                    value={letter.body}
                    onChange={(e) => updateLetter('body', e.target.value)}
                    placeholder="How are you doing? Sorry it took me so long to write back..."
                    rows={10}
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 font-serif leading-relaxed focus:outline-none focus:border-[#00c477]/50 transition-colors resize-none"
                  />
                  <p className="text-[10px] font-mono text-gray-600 tracking-wide">Separate paragraphs with a blank line</p>
                </div>

                <div className="h-px bg-white/5 my-6" />

                {/* Closing */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Closing</label>
                  <div className="flex flex-wrap gap-2">
                    {CLOSING_OPTIONS.map((opt) => {
                      const active = letter.closing === opt;
                      return (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => updateLetter('closing', opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-serif transition-all border
                            ${active
                              ? 'text-[#00c477] border-[#00c477]/40 bg-[#00c477]/10'
                              : 'text-gray-500 border-white/10 bg-[#111] hover:border-white/20 hover:text-gray-300'
                            }
                          `}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Signer Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Signed By</label>
                  <input
                    type="text"
                    value={letter.signer_name}
                    onChange={(e) => updateLetter('signer_name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/50 transition-colors"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="w-full h-64 bg-[#111111] border border-white/5 rounded-xl mb-8 relative overflow-hidden shadow-[0_0_30px_rgba(0,196,119,0.02)]">
                  <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00c477] animate-pulse"></div>
                    <span className="text-[10px] font-mono text-[#00c477] tracking-widest">
                      AUTH_TOKEN: #{Math.random().toString(16).slice(2, 6).toUpperCase()}-SEC
                    </span>
                  </div>
                  <SignaturePad onSignatureChange={setSignatureData} />
                </div>

                <label className="flex items-start gap-4 cursor-pointer group mb-10">
                  <div className="relative flex items-center justify-center mt-1">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <div className={`w-5 h-5 rounded border transition-all duration-200 flex items-center justify-center
                      ${agreed ? 'bg-[#00c477] border-[#00c477]' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}
                    `}>
                      {agreed && (
                        <svg className="w-3.5 h-3.5 text-[#0a0a0a]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 leading-relaxed">
                    I have read and agree to the terms of the Master Services Agreement. I authorize the activation of the <strong className="text-[#00c477] font-mono font-normal">Hackract AI Agent</strong> within my environment.
                  </span>
                </label>
              </>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all duration-300
                ${submitting
                  ? 'bg-[#00c477]/50 text-[#0a0a0a] cursor-not-allowed'
                  : 'bg-[#00c477] hover:bg-[#00e088] text-[#0a0a0a] hover:shadow-[0_0_30px_rgba(0,196,119,0.4)] hover:-translate-y-0.5'
                }
              `}
            >
              {submitting ? (isOrg ? 'SAVING...' : 'EXECUTING...') : (isOrg ? 'SAVE LETTER' : 'SIGN & SUBMIT')}
            </button>

            <p className="text-[10px] text-center font-mono text-gray-600 tracking-widest mt-4 uppercase">
              {isOrg ? 'FRIENDLY LETTER · ENCRYPTED AT REST' : 'TRANSACTION ID: 0XB2F...A109'}
            </p>
          </MotionDiv>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 w-full px-6 py-3 border-t border-[#00c477]/10 bg-[#00c477]/5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#00c477]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.956 11.956 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[10px] font-mono text-[#00c477]">{isOrg ? 'COMPOSER: Ready' : 'AI_Agent: System Ready'}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
            <span>ENCRYPTION: RSA-4096</span>
            <span>NODE: US-EAST-1</span>
          </div>
        </div>

      </div>

    </div>
  );
}
