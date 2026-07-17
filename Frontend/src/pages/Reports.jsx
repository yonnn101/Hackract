import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiDownload, FiCode, FiSend, FiFileText, FiZoomIn, FiMaximize2, FiArrowLeft, FiLoader, FiCpu, FiCheck, FiEdit3, FiSettings, FiX } from 'react-icons/fi';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { useAuth } from '../context/authContext.jsx';

// Checkbox Component
const CheckboxOption = ({ id, label, checked, onChange }) => (
  <div
    onClick={onChange}
    className="flex items-center justify-between p-4 bg-[#141518] rounded-xl cursor-pointer border transition-colors border-white/5 hover:border-white/10"
  >
    <div>
      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">
        SECTION_ID: {id}
      </div>
      <div className="text-sm font-bold text-gray-200">{label}</div>
    </div>
    <div className={`w-5 h-5 flex items-center justify-center rounded-md border transition-colors ${checked ? 'bg-[#00c477] border-[#00c477]' : 'bg-[#1e1e24] border-gray-600'}`}>
      {checked && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
    </div>
  </div>
);

// Toggle Switch Component
const ToggleSwitch = ({ label, icon: Icon, checked, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="text-gray-500 w-4 h-4" />}
      <span className="text-sm font-medium text-gray-300">{label}</span>
    </div>
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#00c477]' : 'bg-[#2a2b30]'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const Reports = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(!!projectId);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState(null);
  const [findings, setFindings] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);

  const [step, setStep] = useState(projectId ? 2 : 1);
  const [exportFormat, setExportFormat] = useState('pdf');

  const [modules, setModules] = useState({
    execSummary: true,
    techScope: true,
    vulnMatrix: true,
    remedPath: true,
    screenshots: true,
    cvssBreakdown: true,
    digitalSignature: false
  });

  const [activeConfigTab, setActiveConfigTab] = useState('standard');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ── Task 1: persist drafts across step navigation via localStorage ────────
  const DRAFT_KEY = `hackract_ai_drafts_${projectId}`;
  const [aiDrafts, setAiDraftsRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(`hackract_ai_drafts_${projectId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const setAiDrafts = (updater) => {
    setAiDraftsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(`hackract_ai_drafts_${projectId}`, JSON.stringify(next)); } catch { }
      return next;
    });
  };

  const [selectedDraftFindingId, setSelectedDraftFindingId] = useState(null);
  const [refinementPrompts, setRefinementPrompts] = useState({});
  const [refinementSections, setRefinementSections] = useState({});
  const [refiningId, setRefiningId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedStatus, setSavedStatus] = useState({});

  useEffect(() => {
    api.get('/projects').then(res => setAvailableProjects(res.data?.data || [])).catch(console.error);
  }, []);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [pRes, fRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/findings?pentestId=${projectId}&limit=100`)
      ]);
      const projData = pRes.data?.data ?? pRes.data;

      // Check authorization: only project lead, global org admin, organization owner/admin, or project admin
      const userCollab = projData.collaborators?.find(c => c.userId === user?.id);
      const isProjectAdmin = userCollab?.role === 'PROJECT_ADMIN';
      const isOrgAdmin = user?.roles?.some(r => r.type === 'ORG_ADMIN');
      const isLead = projData.leadPentesterId === user?.id;

      if (!isOrgAdmin && !isLead && !isProjectAdmin) {
        toast.error("Unauthorized: Only project administrators can access report generation");
        navigate(-1);
        return;
      }

      setProject(projData);
      setFindings(fRes.data?.data ?? fRes.data ?? []);
    } catch (e) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId]);

  const toggleModule = (mod) => setModules(prev => ({ ...prev, [mod]: !prev[mod] }));

  const handleGenerateAiDrafts = async () => {
    if (!projectId) return toast.error('No project selected.');
    setAiGenerating(true);
    const toastId = toast.loading('Initializing AI analysis...');
    try {
      const res = await api.post('/reports/ai-draft', { projectId });
      const data = res.data?.data || [];
      setAiDrafts(data);
      if (data.length > 0) {
        setSelectedDraftFindingId(data[0].findingId);
      }
      toast.success('AI Report drafts generated successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('AI analysis failed. Please try again.', { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  const REFINE_SECTIONS = [
    { value: 'all', label: 'Entire Finding' },
    { value: 'target', label: 'Target Asset' },
    { value: 'description', label: 'Finding Description' },
    { value: 'severityImpact', label: 'Severity & Business Impact' },
    { value: 'evidence', label: 'Evidence / Proof' },
    { value: 'remediation', label: 'Possible Remediation' },
  ];

  const handleRefineFinding = async (findingId) => {
    const customPrompt = refinementPrompts[findingId] || '';
    if (!customPrompt.trim()) return toast.error('Please enter refinement instructions.');
    const section = refinementSections[findingId] || 'all';
    setRefiningId(findingId);
    try {
      const res = await api.post('/reports/ai-draft', { projectId, findingId, prompt: customPrompt, section });
      const data = res.data?.data || [];
      if (data.length > 0) {
        const updatedDraft = data[0];
        // ── If refining a single section, merge only that field ──────────────
        setAiDrafts(prev => prev.map(d => {
          if (d.findingId !== findingId) return d;
          if (section === 'all') return updatedDraft;
          return { ...d, aiDraft: { ...d.aiDraft, [section]: updatedDraft.aiDraft[section] } };
        }));
        setRefinementPrompts(prev => ({ ...prev, [findingId]: '' }));
        setSavedStatus(prev => ({ ...prev, [findingId]: false }));
        toast.success(`${section === 'all' ? 'Finding' : REFINE_SECTIONS.find(s => s.value === section)?.label} refined by AI!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Refinement failed.');
    } finally {
      setRefiningId(null);
    }
  };

  const handleSaveFindingDraft = async (findingId) => {
    const draft = aiDrafts.find(d => d.findingId === findingId);
    if (!draft) return;
    setSavingId(findingId);
    try {
      const formattedDescription = `### Description\n${draft.aiDraft.description}\n\n### Severity & Impact\n${draft.aiDraft.severityImpact}`;
      await api.patch(`/findings/${findingId}`, {
        affectedAsset: draft.aiDraft.target,
        description: formattedDescription,
        proof: draft.aiDraft.evidence,
        remediation: draft.aiDraft.remediation
      });
      setSavedStatus(prev => ({ ...prev, [findingId]: true }));
      toast.success('Finding updated in database!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save finding.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAllDrafts = async () => {
    setSavingId('all');
    try {
      await Promise.all(aiDrafts.map(async (draft) => {
        if (savedStatus[draft.findingId]) return;
        const formattedDescription = `### Description\n${draft.aiDraft.description}\n\n### Severity & Impact\n${draft.aiDraft.severityImpact}`;
        await api.patch(`/findings/${draft.findingId}`, {
          affectedAsset: draft.aiDraft.target,
          description: formattedDescription,
          proof: draft.aiDraft.evidence,
          remediation: draft.aiDraft.remediation
        });
      }));
      const newStatus = {};
      aiDrafts.forEach(d => { newStatus[d.findingId] = true; });
      setSavedStatus(newStatus);
      toast.success('All drafts applied to database!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save some drafts.');
    } finally {
      setSavingId(null);
    }
  };


  // ── JSON export (client-side) ───────────────────────────────────────────────
  const handleJsonExport = () => {
    if (!projectId && findings.length === 0) return toast.error('No project data loaded to export.');
    const payload = {
      generatedAt: new Date().toISOString(),
      project: project || { name: 'Demo Report' },
      findings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hackract-Report-${(project?.name || 'export').replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON report downloaded!');
  };

  // ── Main preview handler ────────────────────────────────────────────────────
  const handlePreviewPdf = async () => {
    if (!projectId) return toast.error('No project selected to preview.');

    setGenerating(true);
    const toastId = toast.loading('Synthesizing PDF preview…');

    try {
      const response = await api.post(
        '/reports/generate',
        { projectId, modules },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPreviewModal(true);

      toast.success('Preview generated successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Preview synthesis failed. Please try again.', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // ── Main generate handler ───────────────────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (!projectId) return toast.error('No project selected to generate PDF.');

    setGenerating(true);
    const toastId = toast.loading('Synthesizing PDF document…');

    try {
      const response = await api.post(
        '/reports/generate',
        { projectId, modules },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = (project?.name || 'Report').replace(/\s+/g, '-').substring(0, 40);
      a.href = url;
      a.download = `Hackract-Report-${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report deployed successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('PDF synthesis failed. Please try again.', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'LOW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const projectName = project?.data?.name || project?.name || 'NEXUS_CORE';
  const orgName = project?.data?.organization?.name || project?.organization?.name || 'QUANTUM_DYNAMICS_INTL';
  const today = new Date().toISOString().replace('T', ' // ').substring(0, 19);

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f12] text-gray-300 font-sans overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-start justify-between px-8 py-6 border-b border-[#1c1d21]">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
              <FiArrowLeft size={18} />
            </button>

          </div>
        </div>

      </div>

      <div className="flex flex-1 p-8 gap-8 max-w-[1600px] mx-auto w-full">
        {/* Left Column - Configuration */}
        <div className="flex-1 max-w-[700px] flex flex-col gap-6">

          {/* Progress Bar */}
          <div className="flex gap-2 mb-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? (step === 1 ? 'bg-linear-to-r from-[#00c477] to-[#1c1d21]' : 'bg-[#00c477]') : 'bg-[#1c1d21]'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? (step === 2 ? 'bg-linear-to-r from-[#00c477] to-[#1c1d21]' : 'bg-[#00c477]') : 'bg-[#1c1d21]'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 3 ? (step === 3 ? 'bg-linear-to-r from-[#00c477] to-[#1c1d21]' : 'bg-[#00c477]') : 'bg-[#1c1d21]'}`} />
          </div>

          {step === 1 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00c477] flex items-center justify-center text-black font-black text-xs">
                  01
                </div>
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Export_Parameters</h2>
              </div>
              <div className="bg-[#0f1115] border border-[#1c1d21] rounded-2xl p-6 flex-1 flex flex-col">
                <div className="mb-8">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-4">Target Project</h3>
                  <select
                    value={projectId || ''}
                    onChange={e => setSearchParams({ projectId: e.target.value })}
                    className="w-full bg-[#141518] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00c477] appearance-none"
                  >
                    <option value="" disabled>Select a project to analyze...</option>
                    {availableProjects.filter(p => {
                      const isOrgAdmin = user?.roles?.some(r => r.type === 'ORG_ADMIN');
                      const isLead = p.leadPentesterId === user?.id;
                      const userCollab = p.collaborators?.find(c => c.userId === user?.id);
                      const isProjectAdmin = userCollab?.role === 'PROJECT_ADMIN';
                      return isOrgAdmin || isLead || isProjectAdmin;
                    }).map(p => (
                      <option key={p.id} value={p.id}>{p.name || 'Untitled Project'}</option>
                    ))}
                  </select>
                </div>

                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-4">Select Format</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setExportFormat('pdf')} className={`p-6 rounded-xl border flex flex-col items-center gap-4 transition-all ${exportFormat === 'pdf' ? 'border-[#00c477] bg-[#00c477]/10 text-[#00c477]' : 'border-white/5 bg-[#141518] hover:border-white/20 text-gray-400'}`}>
                    <FiFileText size={32} />
                    <span className="font-bold tracking-widest uppercase">PDF Document</span>
                  </button>
                  <button onClick={() => setExportFormat('json')} className={`p-6 rounded-xl border flex flex-col items-center gap-4 transition-all ${exportFormat === 'json' ? 'border-[#00c477] bg-[#00c477]/10 text-[#00c477]' : 'border-white/5 bg-[#141518] hover:border-white/20 text-gray-400'}`}>
                    <FiCode size={32} />
                    <span className="font-bold tracking-widest uppercase">JSON Payload</span>
                  </button>
                </div>
                <div className="flex gap-4 mt-auto pt-6">
                  <button onClick={() => navigate(-1)} className="px-6 py-3.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 uppercase tracking-widest hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!projectId) return toast.error('Please select a Target Project first.');
                      setStep(2);
                    }}
                    className="flex-1 bg-[#a3ffcc] hover:bg-[#00c477] text-[#004d2e] rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center"
                  >
                    Next_Step
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00c477] flex items-center justify-center text-black font-black text-xs">
                  02
                </div>
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Content_Scope_Configuration</h2>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#141518] p-1 rounded-xl border border-white/5 w-full mt-4">
                <button
                  onClick={() => setActiveConfigTab('standard')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeConfigTab === 'standard' ? 'bg-[#00c477] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Standard Parameters
                </button>
                <button
                  onClick={() => setActiveConfigTab('ai-guided')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeConfigTab === 'ai-guided' ? 'bg-[#00c477] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <FiCpu className="animate-pulse" /> AI-Guided Drafts
                </button>
              </div>

              <div className="bg-[#0f1115] border border-[#1c1d21] rounded-2xl p-6 flex-1 flex flex-col mt-4">
                {activeConfigTab === 'standard' ? (
                  <>
                    {/* Grid Options */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <CheckboxOption id="EX_SUM" label="Executive Summary" checked={modules.execSummary} onChange={() => toggleModule('execSummary')} />
                      <CheckboxOption id="TECH_SCOPE" label="Technical Scope" checked={modules.techScope} onChange={() => toggleModule('techScope')} />
                      <CheckboxOption id="FINDINGS_M" label="Vulnerability Matrix" checked={modules.vulnMatrix} onChange={() => toggleModule('vulnMatrix')} />
                      <CheckboxOption id="REMED_PATH" label="Remediation Roadmap" checked={modules.remedPath} onChange={() => toggleModule('remedPath')} />
                    </div>

                    {/* Advanced Metadata Injection */}
                    <div className="mb-8">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-4">Advanced_Metadata_Injection</h3>
                      <div className="space-y-1">
                        <ToggleSwitch label="Include Evidence Screenshots" icon={FiFileText} checked={modules.screenshots} onChange={() => toggleModule('screenshots')} />
                        <ToggleSwitch label="CVSS Score Breakdown" icon={FiFileText} checked={modules.cvssBreakdown} onChange={() => toggleModule('cvssBreakdown')} />
                        <ToggleSwitch label="Digital Signature Verification" icon={FiFileText} checked={modules.digitalSignature} onChange={() => toggleModule('digitalSignature')} />
                      </div>
                    </div>

                    {/* Live Data Feed */}
                    <div className="flex-1 flex flex-col min-h-[200px]">
                      <div className="flex justify-between items-end mb-3">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Live_Data_Feed</h3>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">RECORDS: {findings.length}</span>
                      </div>
                      <div className="flex-1 bg-[#141518] border border-[#1c1d21] rounded-xl overflow-hidden flex flex-col">
                        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#111215] border-b border-[#1c1d21] text-[9px] font-black text-gray-500 uppercase tracking-widest">
                          <div className="col-span-2">ID</div>
                          <div className="col-span-6">Vulnerability</div>
                          <div className="col-span-2 text-center">Severity</div>
                          <div className="col-span-2 text-right">CVSS</div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                          {loading ? (
                            <div className="flex justify-center py-8 text-[#00c477]"><FiLoader className="animate-spin" /></div>
                          ) : findings.length === 0 ? (
                            <div className="text-center text-xs text-gray-600 py-8 font-mono">NO FINDINGS DETECTED</div>
                          ) : (
                            findings.slice(0, 6).map((f, i) => (
                              <div key={f.id} className="grid grid-cols-12 gap-2 px-2 py-2.5 items-center hover:bg-white/5 rounded-lg transition-colors cursor-default">
                                <div className="col-span-2 text-[10px] font-mono text-[#00c477]">
                                  #RX-{String(i + 1).padStart(3, '0')}
                                </div>
                                <div className="col-span-6 text-xs text-gray-300 font-medium truncate" title={f.title}>
                                  {f.title}
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getSeverityStyle(f.severity)}`}>
                                    {f.severity}
                                  </span>
                                </div>
                                <div className="col-span-2 text-right text-xs font-mono font-bold text-gray-300">
                                  {f.cvssScore ? Number(f.cvssScore).toFixed(1) : 'N/A'}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // AI-guided builder contents
                  <div className="flex-1 flex flex-col min-h-[400px]">
                    {aiGenerating ? (
                      <div className="flex-1 flex flex-col justify-center items-center py-12 px-6 font-mono bg-[#07080a] border border-white/5 rounded-2xl text-[#00c477] space-y-4">
                        <FiLoader className="animate-spin text-3xl" />
                        <div className="w-full max-w-md bg-black/50 border border-[#00c477]/30 rounded p-4 text-xs space-y-2 h-48 overflow-y-auto">
                          <div className="text-gray-500">[SYSTEM] SYSTEM OVERLINK INITIATED...</div>
                          <div className="text-[#00c477]">[SYSTEM] ACCESSING TELEMETRY FOR WORKSPACE RX-{(projectId || 'DEFAULT').substring(0, 6).toUpperCase()}</div>
                          <div className="text-[#00c477] animate-pulse">[SYSTEM] RETRIEVING DISCOVERED VULNERABILITY RECORDS...</div>
                          <div className="text-yellow-500">[SYSTEM] PIPING DATA THROUGH AI TRANSLATOR...</div>
                          <div className="text-white/40">[SYSTEM] STRUCTURING DESCRIPTION & ACTIONABLE REMEDIATION ROADMAP...</div>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">PLEASE WAIT: AI SYNTHESIZING DRAFT MODEL</div>
                      </div>
                    ) : aiDrafts.length === 0 ? (
                      <div className="flex-1 flex flex-col justify-center items-center py-12 px-6 text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center text-[#00c477]">
                          <FiCpu size={32} />
                        </div>
                        <div className="max-w-md space-y-2">
                          <h3 className="text-lg font-black text-white uppercase tracking-wider">AI Sentinel Report Assistant</h3>
                          <p className="text-sm text-gray-400">
                            Let the AI Sentinel parse and refine your raw findings into structured documentation. It will build detailed targets, severity impacts, evidence details, and precise remediation procedures for each finding.
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateAiDrafts}
                          className="px-8 py-3.5 bg-[#a3ffcc] hover:bg-[#00c477] text-[#004d2e] rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          <FiCpu /> Analyze Findings & Generate Drafts
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex gap-4 overflow-hidden h-[500px]">
                        {/* Findings List Sidebar */}
                        <div className="w-1/3 border-r border-white/5 pr-4 flex flex-col gap-2 overflow-y-auto">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">DRAFTS</span>
                            <button
                              onClick={handleSaveAllDrafts}
                              disabled={savingId === 'all'}
                              className="text-[9px] font-bold text-[#00c477] hover:underline uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                            >
                              {savingId === 'all' ? <FiLoader className="animate-spin" /> : <FiCheck />} Apply All
                            </button>
                          </div>
                          {aiDrafts.map((d, index) => {
                            const isSelected = selectedDraftFindingId === d.findingId;
                            const isSaved = savedStatus[d.findingId];
                            return (
                              <div
                                key={d.findingId}
                                onClick={() => setSelectedDraftFindingId(d.findingId)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${isSelected ? 'bg-[#00c477]/10 border-[#00c477]' : 'bg-[#141518] border-white/5 hover:border-white/10'}`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <div className="text-[9px] font-mono text-gray-500 uppercase">RX-{String(index + 1).padStart(3, '0')}</div>
                                  {isSaved && (
                                    <span className="text-[9px] font-black bg-[#00c477]/20 text-[#00c477] px-1 rounded flex items-center gap-0.5">
                                      <FiCheck size={8} /> SAVED
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-gray-200 mt-1 truncate" title={d.title}>{d.title}</div>
                                <div className="text-[9px] font-mono font-bold mt-1 uppercase text-[#00c477]">{d.severity}</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Finding Draft Editor */}
                        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pl-2 pr-1 text-left">
                          {(() => {
                            const activeDraft = aiDrafts.find(d => d.findingId === selectedDraftFindingId);
                            if (!activeDraft) return <div className="text-center text-xs text-gray-600 py-12">Select a finding to edit.</div>;

                            return (
                              <>
                                <div className="border-b border-white/5 pb-2 mb-2">
                                  <h4 className="text-sm font-black text-white uppercase">{activeDraft.title}</h4>
                                  <div className="text-[9px] text-gray-500 font-mono mt-1">FINDING ID: {activeDraft.findingId}</div>
                                </div>

                                {/* Fields */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Target Asset</label>
                                    <input
                                      type="text"
                                      value={activeDraft.aiDraft.target}
                                      onChange={(e) => {
                                        setAiDrafts(prev => prev.map(d => d.findingId === selectedDraftFindingId ? {
                                          ...d, aiDraft: { ...d.aiDraft, target: e.target.value }
                                        } : d));
                                        setSavedStatus(prev => ({ ...prev, [selectedDraftFindingId]: false }));
                                      }}
                                      className="w-full bg-[#141518] border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c477]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Finding Description</label>
                                    <textarea
                                      rows="3"
                                      value={activeDraft.aiDraft.description}
                                      onChange={(e) => {
                                        setAiDrafts(prev => prev.map(d => d.findingId === selectedDraftFindingId ? {
                                          ...d, aiDraft: { ...d.aiDraft, description: e.target.value }
                                        } : d));
                                        setSavedStatus(prev => ({ ...prev, [selectedDraftFindingId]: false }));
                                      }}
                                      className="w-full bg-[#141518] border border-white/5 rounded-lg p-3 text-xs text-white outline-none focus:border-[#00c477] font-sans resize-y"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Severity & Business Impact</label>
                                    <textarea
                                      rows="3"
                                      value={activeDraft.aiDraft.severityImpact}
                                      onChange={(e) => {
                                        setAiDrafts(prev => prev.map(d => d.findingId === selectedDraftFindingId ? {
                                          ...d, aiDraft: { ...d.aiDraft, severityImpact: e.target.value }
                                        } : d));
                                        setSavedStatus(prev => ({ ...prev, [selectedDraftFindingId]: false }));
                                      }}
                                      className="w-full bg-[#141518] border border-white/5 rounded-lg p-3 text-xs text-white outline-none focus:border-[#00c477] font-sans resize-y"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Evidence / Proof</label>
                                    <textarea
                                      rows="3"
                                      value={activeDraft.aiDraft.evidence}
                                      onChange={(e) => {
                                        setAiDrafts(prev => prev.map(d => d.findingId === selectedDraftFindingId ? {
                                          ...d, aiDraft: { ...d.aiDraft, evidence: e.target.value }
                                        } : d));
                                        setSavedStatus(prev => ({ ...prev, [selectedDraftFindingId]: false }));
                                      }}
                                      className="w-full bg-[#141518] border border-white/5 rounded-lg p-3 text-xs text-white outline-none focus:border-[#00c477] font-mono resize-y"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Possible Remediation</label>
                                    <textarea
                                      rows="3"
                                      value={activeDraft.aiDraft.remediation}
                                      onChange={(e) => {
                                        setAiDrafts(prev => prev.map(d => d.findingId === selectedDraftFindingId ? {
                                          ...d, aiDraft: { ...d.aiDraft, remediation: e.target.value }
                                        } : d));
                                        setSavedStatus(prev => ({ ...prev, [selectedDraftFindingId]: false }));
                                      }}
                                      className="w-full bg-[#141518] border border-white/5 rounded-lg p-3 text-xs text-white outline-none focus:border-[#00c477] font-sans resize-y"
                                    />
                                  </div>
                                </div>

                                {/* AI Refinement & Save */}
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3 bg-[#111215] p-4 rounded-xl border border-white/5">
                                  <div>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-[8px] font-black text-[#00c477] uppercase tracking-widest font-mono flex items-center gap-1"><FiCpu /> Refine with AI Assistant</span>
                                      {refiningId === selectedDraftFindingId && <span className="text-[8px] font-mono text-yellow-500 animate-pulse">Refining...</span>}
                                    </div>

                                    {/* Task 2: Section selector dropdown */}
                                    <div className="mb-2">
                                      <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-1">Refine Section</label>
                                      <select
                                        value={refinementSections[selectedDraftFindingId] || 'all'}
                                        onChange={(e) => setRefinementSections(prev => ({ ...prev, [selectedDraftFindingId]: e.target.value }))}
                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c477] cursor-pointer"
                                      >
                                        {REFINE_SECTIONS.map(s => (
                                          <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder={`e.g. 'explain impact for compliance' or 'add nginx steps'`}
                                        value={refinementPrompts[selectedDraftFindingId] || ''}
                                        onChange={(e) => setRefinementPrompts(prev => ({ ...prev, [selectedDraftFindingId]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleRefineFinding(selectedDraftFindingId); }}
                                        className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c477]"
                                      />
                                      <button
                                        onClick={() => handleRefineFinding(selectedDraftFindingId)}
                                        disabled={refiningId === selectedDraftFindingId || !(refinementPrompts[selectedDraftFindingId] || '').trim()}
                                        className="px-4 py-2 bg-[#00c477] hover:bg-[#00c477]/80 text-black text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                      >
                                        <FiSend size={12} /> Refine
                                      </button>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleSaveFindingDraft(selectedDraftFindingId)}
                                    disabled={savingId === selectedDraftFindingId}
                                    className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${savedStatus[selectedDraftFindingId] ? 'bg-white/10 text-white/50 border border-white/10 cursor-default' : 'bg-[#00c477] hover:bg-[#00c477]/80 text-black'}`}
                                  >
                                    {savingId === selectedDraftFindingId ? (
                                      <>
                                        <FiLoader className="animate-spin" /> Saving to Database...
                                      </>
                                    ) : savedStatus[selectedDraftFindingId] ? (
                                      <>
                                        <FiCheck /> Applied & Saved to database
                                      </>
                                    ) : (
                                      <>
                                        <FiSettings /> Save & Apply to Finding
                                      </>
                                    )}
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Buttons */}
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 uppercase tracking-widest hover:bg-white/5 transition-colors">
                    Previous_Step
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 bg-[#a3ffcc] hover:bg-[#00c477] text-[#004d2e] rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center">
                    Compile_Preview
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00c477] flex items-center justify-center text-black font-black text-xs">
                  03
                </div>
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Synthesis_&_Deployment</h2>
              </div>
              <div className="bg-[#0f1115] border border-[#1c1d21] rounded-2xl p-6 flex-1 flex flex-col justify-center items-center text-center">
                <FiSend size={48} className="text-[#00c477] mb-6 animate-pulse" />
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Ready for Deployment</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-[250px]">
                  All parameters configured. The {exportFormat === 'pdf' ? 'PDF document' : 'JSON payload'} is ready to be compiled and securely downloaded to your local system.
                </p>
                <div className="flex gap-4 w-full mt-auto">
                  <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 uppercase tracking-widest hover:bg-white/5 transition-colors">
                    Previous_Step
                  </button>
                  <button
                    onClick={exportFormat === 'pdf' ? handleGeneratePdf : handleJsonExport}
                    disabled={generating}
                    className="flex-1 bg-[#a3ffcc] hover:bg-[#00c477] disabled:opacity-50 text-[#004d2e] rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    {generating ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                    {generating ? 'Downloading...' : 'Download_Now'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Preview & Actions */}
        <div className="w-[450px] xl:w-[500px] flex flex-col gap-4">
          <div className="bg-[#141518] border border-[#1c1d21] rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00c477] animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live_Print_Preview</span>
              </div>
              <div className="flex gap-2 text-gray-500">
                <button className="hover:text-white transition-colors"><FiZoomIn size={16} /></button>
                <button className="hover:text-white transition-colors"><FiMaximize2 size={16} /></button>
              </div>
            </div>

            {/* PDF Canvas Mockup */}
            <div className="flex-1 bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#2a2b30] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col p-8 relative">
              {/* Fake gradient light */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="text-[#00c477] font-black text-lg tracking-[0.2em] mb-2 z-10">HACKRACT</div>
              <div className="text-gray-500 text-[9px] font-mono tracking-widest uppercase mb-16 z-10">SYNTHETIC_SENTINEL_V4.0</div>

              <div className="flex-1 flex flex-col justify-center z-10">
                <div className="text-[#00c477] text-[10px] font-black tracking-widest uppercase mb-2">PROJECT_MANIFEST</div>
                <h1 className="text-3xl font-black text-white uppercase leading-none mb-2 wrap-break-word">
                  {projectName}<br />SECURITY_AUDIT
                </h1>
              </div>

              <div className="z-10 border-l border-[#00c477]/30 pl-4 mt-auto">
                <div className="text-[8px] font-black text-gray-500 tracking-widest uppercase mb-1 flex justify-between">
                  <span>GENERATED_FOR</span>
                  <span className="text-[#00c477]">CONFIDENTIAL</span>
                </div>
                <div className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-4">
                  {orgName} <span className="text-red-500 text-[10px] ml-1 px-1 bg-red-500/20 rounded">LEVEL_9_TOP_SECRET</span>
                </div>

                <div className="text-[8px] font-black text-gray-500 tracking-widest uppercase mb-1">DATE_ISSUED</div>
                <div className="text-[10px] font-mono text-gray-300 tracking-widest flex items-center justify-between">
                  <span>{today}</span>
                  <div className="w-4 h-4 text-[#00c477]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                </div>
              </div>
            </div>
          </div>

          {pdfPreviewUrl ? (
            <div className="flex flex-col gap-2">
              <button
                id="generate_report_project"
                onClick={() => setShowPreviewModal(true)}
                className="w-full bg-[#a3ffcc] hover:bg-[#00c477] text-[#004d2e] rounded-xl py-4 flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-sm"
              >
                <FiFileText size={18} /> PREVIEW DOCUMENT
              </button>

            </div>
          ) : (
            <button
              id="generate_report_project"
              onClick={handlePreviewPdf}
              disabled={generating}
              className="w-full bg-[#a3ffcc] hover:bg-[#00c477] disabled:opacity-50 text-[#004d2e] rounded-xl py-4 flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-sm"
            >
              {generating ? <FiLoader className="animate-spin" size={18} /> : <FiFileText size={18} />}
              {generating ? 'SYNTHESIZING_PREVIEW...' : 'PREVIEW DOCUMENT'}
            </button>
          )}

        </div>
      </div>

      {showPreviewModal && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f1115] border border-[#2a2b30] rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1d21]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00c477] animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">
                  HackRact Sentinel - Live Report Preview
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-[#07080a] p-4 relative">
              <object
                data={pdfPreviewUrl}
                type="application/pdf"
                className="w-full h-full border border-white/5 rounded-xl"
              >
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full border-none rounded-xl"
                  title="PDF Report Preview"
                />
              </object>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-[#1c1d21] bg-[#0d0f12]">
              <span className="text-[10px] font-mono text-gray-500 uppercase">
                PROJECT: {projectName}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-5 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-300 uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    const name = (project?.name || 'Report').replace(/\s+/g, '-').substring(0, 40);
                    a.href = pdfPreviewUrl;
                    a.download = `Hackract-Report-${name}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success('Report downloaded successfully!');
                  }}
                  className="px-6 py-2.5 bg-[#00c477] hover:bg-[#00c477]/80 text-black rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <FiDownload size={14} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;