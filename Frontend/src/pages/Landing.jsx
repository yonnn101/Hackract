import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";

/* ─── Google Fonts injected once ─────────────────────────────────────────── */
if (!document.getElementById("hk-fonts")) {
  const link = document.createElement("link");
  link.id = "hk-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;600&display=swap";
  document.head.appendChild(link);
}

/* ─── Icons (inline SVG helpers) ─────────────────────────────────────────── */
const Icon = ({ d, size = 20, stroke = 1.5, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

/* ─── Data ────────────────────────────────────────────────────────────────── */
const PROTOCOLS = [
  {
    icon: ["M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"],
    label: "Visual Mind-Map",
    desc: "Drag-and-drop workflow creation. Connect attack steps visually. Customize and organize testing process.",
    accent: "#00ff9d",
  },
  {
    icon: ["M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z","M9 9h6v6H9V9z"],
    label: "AI Specialist",
    desc: "Gives smart recommendations. Suggests attack paths and tools. Explains vulnerabilities and next steps.",
    accent: "#00ff9d",
  },
  {
    icon: ["M13 10V3L4 14h7v7l9-11h-7z"],
    label: "Autonomous Agents",
    desc: "Automatically performs testing tasks. Scans and finds vulnerabilities continuously. Adapts actions based on results.",
    accent: "#00ff9d",
  },
  {
    icon: ["M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"],
    label: "Integrated Terminal",
    desc: "Run security tools directly in the platform. Execute commands and scripts. View and save outputs in real time.",
    accent: "#00ff9d",
  },
  {
    icon: ["M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"],
    label: "Collaboration",
    desc: "Work with team members in real time. Share workflows, notes, and findings. Communicate inside the platform.",
    accent: "#00ff9d",
  },
  {
    icon: ["M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"],
    label: "Hacker Marketplace",
    desc: "Find and hire skilled hackers. Showcase hacker profiles and skills. Connect organizations with security experts.",
    accent: "#00ff9d",
  },
];

const FLOW_STEPS = [
  {
    phase: "INIT_PHASE",
    color: "#00ff9d",
    label: "PROJECT GENESIS",
    desc: "Define targets, set objectives, import your scope and configure specific attack vectors.",
  },
  {
    phase: "EXEC_PHASE",
    color: "#00ff9d",
    label: "ACTIVE SCAN",
    desc: "Deploy autonomous scanning agents to run high-frequency vulnerability sweeps and penetration steps.",
  },
  {
    phase: "FINAL_PHASE",
    color: "#00ff9d",
    label: "DATA HARVEST",
    desc: "Ai synthesizes your findings into professionalized, client-ready penetration reports and remediation steps.",
  },
];

const HACKER_FEATURES = [
  { label: "Visual Workflow", desc: "Visual workflow for planning and executing tests" },
  { label: "AI Guidance", desc: "AI guidance and automation for faster results" },
  { label: "Integrated Tools", desc: "Integrated tools and terminal in one place" },
  { label: "Collaboration", desc: "Real-time collaboration and shareable profiles" },
];

const ORG_FEATURES = [
  { label: "Visual Tracking", desc: "Visual tracking of testing progress" },
  { label: "AI Insights", desc: "AI-powered insights and vulnerability explanations" },
  { label: "Automated Testing", desc: "Automated security testing and monitoring" },
  { label: "Hacker Management", desc: "Hire and manage skilled hackers easily" },
];

/* ─── Terminal cursor blink component ─────────────────────────────────────── */
const TerminalCursor = () => (
  <span
    style={{
      display: "inline-block",
      width: 9,
      height: 18,
      background: "#00ff9d",
      marginLeft: 3,
      verticalAlign: "middle",
      boxShadow: "0 0 8px #00ff9d",
      animation: "blink 1.1s steps(1) infinite",
    }}
  />
);

/* ─── Video Mockup ─────────────────────────────────────────────────────────── */
const VideoMockup = () => (
  <div
    style={{
      position: "relative",
      width: "100%",
      maxWidth: 860,
      margin: "0 auto",
      borderRadius: 20,
      border: "1px solid rgba(0,255,157,0.12)",
      background: "rgba(18,22,18,0.75)",
      backdropFilter: "blur(32px)",
      boxShadow: "0 0 80px rgba(0,255,157,0.08), 0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}
  >
    {/* Top bar */}
    <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
      ))}
      <div style={{ marginLeft: 12, flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
      <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "rgba(0,255,157,0.6)", letterSpacing: "0.15em" }}>HACKRACT_CMD_v2.4</span>
    </div>

    {/* "Screen" content */}
    <div style={{ position: "relative", paddingBottom: "52%", background: "linear-gradient(145deg, #0a0e0a 0%, #080d08 60%, #0c110c 100%)" }}>
      {/* Grid lines */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(0,255,157,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,157,0.03) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Fake chart lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 860 430" preserveAspectRatio="none">
        <polyline points="0,330 80,290 160,310 240,260 320,280 400,210 480,240 560,180 640,200 720,140 800,160 860,120"
          fill="none" stroke="rgba(0,255,157,0.25)" strokeWidth="1.5" />
        <polyline points="0,380 80,360 160,370 240,340 320,355 400,310 480,330 560,290 640,310 720,265 800,280 860,250"
          fill="none" stroke="rgba(0,255,157,0.1)" strokeWidth="1" />
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#00ff9d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="0,330 80,290 160,310 240,260 320,280 400,210 480,240 560,180 640,200 720,140 800,160 860,120 860,430 0,430"
          fill="url(#chartFill)" />
      </svg>

      {/* Overlay mini panels */}
      <div style={{ position: "absolute", top: 20, left: 24, display: "flex", gap: 12 }}>
        {["NODES: 147", "VULNS: 23", "DEPTH: 7"].map((t, i) => (
          <div key={i} style={{
            padding: "6px 12px", borderRadius: 8,
            background: "rgba(0,255,157,0.05)",
            border: "1px solid rgba(0,255,157,0.12)",
            fontFamily: "JetBrains Mono", fontSize: 9,
            color: "#00ff9d", letterSpacing: "0.12em",
          }}>{t}</div>
        ))}
      </div>

      {/* Glowing play button */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 64, height: 64, borderRadius: "50%",
        background: "rgba(0,255,157,0.12)",
        border: "2px solid rgba(0,255,157,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 40px rgba(0,255,157,0.25), inset 0 0 20px rgba(0,255,157,0.08)",
        cursor: "pointer",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#00ff9d">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      {/* Bottom status bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "8px 20px",
        background: "rgba(0,0,0,0.5)",
        borderTop: "1px solid rgba(0,255,157,0.05)",
        display: "flex", alignItems: "center", gap: 16,
        fontFamily: "JetBrains Mono", fontSize: 9, color: "rgba(0,255,157,0.5)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 6px #00ff9d", display: "inline-block" }} />
          SENTINEL ONLINE
        </span>
        <span>LATENCY: 14ms</span>
        <span style={{ marginLeft: "auto" }}>SCAN_ACTIVE · 0xFF2E4C</span>
      </div>
    </div>
  </div>
);

/* ─── Main Landing ─────────────────────────────────────────────────────────── */
const Landing = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 700 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrollY(window.scrollY);

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const spotlightBg = useMotionTemplate`
    radial-gradient(
     450px circle at ${mouseXSpring}px ${mouseYSpring}px,
      rgba(0, 255, 157, 0.15),
      transparent 80%
    )
  `;

  /* shared transition */
  const fadeUp = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.9s ease ${delay}ms, transform 0.9s ease ${delay}ms`,
  });

  /* glass card style */
  const glassCard = (extra = {}) => ({
    background: "rgba(20,24,20,0.72)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    boxShadow: "0 0 40px rgba(0,255,157,0.04), inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.5)",
    ...extra,
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #131313 0%, #0c0c0c 50%, #0a0a0a 100%)",
      color: "#e2e8e2",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden",
      position: "relative",
    }}>

      {/* ── Global CSS ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulseGlow { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes orbitSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer { 100%{transform:translateX(100%)} }
        @keyframes hkMarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hk-nav-link { font-family:'Space Grotesk',sans-serif; font-size:12px; font-weight:500;
          letter-spacing:0.12em; text-transform:uppercase; color:rgba(200,215,200,0.7);
          text-decoration:none; transition:color 0.2s; cursor:pointer; }
        .hk-nav-link:hover { color:#00ff9d; }
        .hk-proto-card { transition:transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease; }
        .hk-proto-card:hover { transform:translateY(0px);
          box-shadow:0 0 50px rgba(0,255,157,0.1), inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.6);
          border-color:rgba(0,255,157,0.2) !important; }
        .hk-core-marquee { overflow:hidden; mask-image:linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%); }
        .hk-core-track { display:flex; gap:20px; width:max-content; animation:hkMarquee 40s linear infinite; }
        .hk-core-marquee:hover .hk-core-track { animation-play-state:paused; }
        .hk-btn-primary { position:relative; overflow:hidden; cursor:pointer; transition:all 0.3s ease; }
        .hk-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 40px rgba(0,255,157,0.45) !important; }
        .hk-btn-primary::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);
          transform:translateX(-100%); transition:transform 0.6s; }
        .hk-btn-primary:hover::after { transform:translateX(100%); }
        .hk-btn-ghost { cursor:pointer; transition:all 0.3s ease; }
        .hk-btn-ghost:hover { background:rgba(0,255,157,0.06) !important; border-color:rgba(0,255,157,0.25) !important; color:#00ff9d !important; }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#0a0a0a; }
        ::-webkit-scrollbar-thumb { background:rgba(0,255,157,0.2); border-radius:2px; }
      `}</style>

      {/* ── Technical grid overlay ────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,255,157,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,157,0.025) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/* ── Mouse Spotlight ───────────────────────────────────────── */}
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: spotlightBg,
        }}
      />

      {/* ── Ambient orbs ─────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,157,0.055) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, filter: "blur(40px)" }} />
      <div style={{ position: "fixed", top: "55%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,157,0.035) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, filter: "blur(40px)" }} />

      {/* ═══════════════════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 40px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrollY > 20 ? "rgba(13,13,13,0.85)" : "rgba(13,13,13,0.5)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        transition: "background 0.4s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "rgba(0,255,157,0.08)",
            border: "1px solid rgba(0,255,157,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(0,255,157,0.15)",
            color: "#00ff9d",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 17l6-6-6-6M12 19h8" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.22em", color: "#e8f0e8" }}>HACKRACT</span>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="hk-btn-ghost"
            onClick={() => navigate("/login")}
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600,
              fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(180,200,180,0.8)", background: "transparent", border: "none",
              padding: "8px 16px",
            }}
          >
            Login
          </button>
          <button
            className="hk-btn-primary"
            onClick={() => navigate("/register")}
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
              fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "#000", background: "linear-gradient(135deg,#00ff9d 0%,#00e38b 100%)",
              border: "none", borderRadius: 8,
              padding: "9px 22px",
              boxShadow: "0 0 24px rgba(0,255,157,0.3)",
            }}
          >
            Initialize
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop: 160, paddingBottom: 80, textAlign: "center", position: "relative", zIndex: 1 }}>
        {/* Main title */}
        <div style={fadeUp(80)}>
          <h1 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 700,
            fontSize: "clamp(52px,9vw,96px)",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            marginBottom: 28,
            background: "linear-gradient(180deg, #ffffff 0%, rgba(200,220,200,0.75) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 40px rgba(0,255,157,0.15))",
          }}>
            HACKRACT<TerminalCursor />
          </h1>
          <p style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: "clamp(15px,2vw,20px)",
            fontWeight: 300,
            color: "rgba(180,200,180,0.75)",
            maxWidth: 560,
            margin: "0 auto 44px",
            lineHeight: 1.65,
            letterSpacing: "0.01em",
          }}>
            A <span style={{ color: '#00ff9d', fontWeight: 600 }}>unifies</span> visual workflow mapping, <span style={{ color: '#00ff9d', fontWeight: 600 }}>intelligent</span> automation, and real-time <span style={{ color: '#00ff9d', fontWeight: 600 }}>collaboration</span> into a single environment.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              className="hk-btn-primary"
              onClick={() => navigate("/register/hacker")}
              style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase",
                color: "#000",
                background: "linear-gradient(135deg,#00ff9d 0%,#00e38b 100%)",
                border: "none", borderRadius: 10,
                padding: "14px 32px",
                boxShadow: "0 0 32px rgba(0,255,157,0.35)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              Access System
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video mockup */}
        <div
  style={{
    ...fadeUp(200),
    maxWidth: 900,
    margin: "72px auto 0",
    padding: "0 24px",
  }}
>
  <img
    src="../../canva.png"
    alt="Canva preview"
    style={{ width: "100%", height: "auto", display: "block" }}
    className="rounded-[30px] border-[0.5px] border-[#00ff90]"
  />
</div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Core Features
      ════════════════════════════════════════════════════════════════ */}
      <section id="protocols" style={{ position: "relative", zIndex: 1, padding: "100px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 1, background: "#00ff9d", boxShadow: "0 0 8px #00ff9d" }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.35em", textTransform: "uppercase", color: "#00ff9d" }}>Functional Modules</span>
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: "clamp(32px,5vw,52px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#eef4ee",
              lineHeight: 1.1,
            }}>
              Core Features
            </h2>
          </div>

          {/* Sliding core features */}
          <div className="hk-core-marquee">
            <div className="hk-core-track">
              {[...PROTOCOLS, ...PROTOCOLS].map((p, i) => (
                <div key={`${p.label}-${i}`} className="hk-proto-card" style={{
                  ...glassCard({ padding: 38, borderRadius: 20, cursor: "default" }),
                  position: "relative", overflow: "hidden",
                  minWidth: 320,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, marginBottom: 22,
                    background: "rgba(0,255,157,0.08)",
                    border: "1px solid rgba(0,255,157,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#00ff9d",
                    boxShadow: "0 0 16px rgba(0,255,157,0.1)",
                  }}>
                    <Icon d={p.icon} size={22} />
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: 15, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "#d0e8d0", marginBottom: 12,
                  }}>{p.label}</h3>
                  <p style={{
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 14, fontWeight: 300,
                    color: "rgba(160,185,160,0.75)", lineHeight: 1.7,
                  }}>{p.desc}</p>
                  {/* Corner glow */}
                  <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,255,157,0.04)", filter: "blur(20px)", pointerEvents: "none" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          OPERATIONAL FLOW
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 64 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 20, height: 1, background: "#00ff9d" }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.35em", textTransform: "uppercase", color: "#00ff9d" }}>Execution Methodology</span>
              <div style={{ width: 20, height: 1, background: "#00ff9d" }} />
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: "clamp(28px,4vw,46px)",
              fontWeight: 700, letterSpacing: "-0.02em",
              color: "#eef4ee",
            }}>OPERATIONAL FLOW</h2>
            <p style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 12, color: "rgba(140,170,140,0.6)",
              letterSpacing: "0.15em", marginTop: 10,
            }}>PHASE 01 → PHASE 02 → PHASE 03</p>
          </div>

          {/* 3 circles + connectors */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "nowrap" }}>
            {FLOW_STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 260, padding: "0 10px" }}>
                  {/* Phase label */}
                  <div style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                    color: "#00ff9d", marginBottom: 18,
                  }}>{step.phase}</div>

                  {/* Circle */}
                  <div style={{
                    width: 110, height: 110, borderRadius: "50%",
                    background: "rgba(0,255,157,0.06)",
                    border: "1.5px solid rgba(0,255,157,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 40px rgba(0,255,157,0.1), inset 0 0 30px rgba(0,255,157,0.04)",
                    marginBottom: 24,
                    position: "relative",
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "rgba(0,255,157,0.12)",
                      border: "1px solid rgba(0,255,157,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#00ff9d",
                      boxShadow: "0 0 16px rgba(0,255,157,0.2)",
                    }}>
                      {i === 0 && <Icon d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" size={20} />}
                      {i === 1 && <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={20} />}
                      {i === 2 && <Icon d={["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"]} size={20} />}
                    </div>
                  </div>

                  <h4 style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
                    color: "#d0e8d0", marginBottom: 12, textTransform: "uppercase",
                  }}>{step.label}</h4>
                  <p style={{
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 13.5, fontWeight: 300,
                    color: "rgba(150,175,150,0.7)", lineHeight: 1.7, textAlign: "center",
                  }}>{step.desc}</p>
                </div>

                {/* Connector */}
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{
                    flexShrink: 0, display: "flex", alignItems: "center",
                    paddingBottom: 60,
                  }}>
                    <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, rgba(0,255,157,0.3), rgba(0,255,157,0.1))" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 8px #00ff9d", flexShrink: 0 }} />
                    <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, rgba(0,255,157,0.1), rgba(0,255,157,0.3))" }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          THE HACKER + THE ENTERPRISE
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 40px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* THE HACKER */}
          <div style={{
            ...glassCard({ padding: 44, borderRadius: 22 }),
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,255,157,0.5)" }}>OPERATOR_ID</span>
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 700, color: "#eef4ee",
              letterSpacing: "-0.02em", marginBottom: 32,
            }}>THE HACKER</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 36 }}>
              {HACKER_FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: "rgba(0,255,157,0.1)",
                    border: "1px solid rgba(0,255,157,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#00ff9d",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b8d4b8", marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 300, color: "rgba(140,165,140,0.7)", lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="hk-btn-primary"
              onClick={() => navigate("/register/hacker")}
              style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
                color: "#000", background: "linear-gradient(135deg,#00ff9d,#00e38b)",
                border: "none", borderRadius: 10, padding: "12px 28px",
                boxShadow: "0 0 28px rgba(0,255,157,0.3)",
              }}
            >Launch Operator
            </button>

            <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(0,255,157,0.04)", filter: "blur(40px)", pointerEvents: "none" }} />
          </div>

          {/* THE ENTERPRISE */}
          <div style={{
            ...glassCard({ padding: 44, borderRadius: 22 }),
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,255,157,0.5)" }}>ENTITY_ID</span>
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 700, color: "#eef4ee",
              letterSpacing: "-0.02em", marginBottom: 32,
            }}>THE ENTERPRISE</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 36 }}>
              {ORG_FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: "rgba(0,255,157,0.1)",
                    border: "1px solid rgba(0,255,157,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#00ff9d",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b8d4b8", marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 300, color: "rgba(140,165,140,0.7)", lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="hk-btn-ghost"
              onClick={() => navigate("/register/organization")}
              style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
                color: "rgba(180,210,180,0.7)",
                background: "rgba(0,255,157,0.04)",
                border: "1px solid rgba(0,255,157,0.15)",
                borderRadius: 10, padding: "12px 28px",
              }}
            >Acquire Access
            </button>

            <div style={{ position: "absolute", bottom: -30, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(0,255,157,0.03)", filter: "blur(40px)", pointerEvents: "none" }} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════ */}
      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(8,10,8,0.85)",
        backdropFilter: "blur(12px)",
        padding: "48px 40px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 40, marginBottom: 40 }}>

            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 7,
                  background: "rgba(0,255,157,0.07)",
                  border: "1px solid rgba(0,255,157,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#00ff9d",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 17l6-6-6-6M12 19h8" />
                  </svg>
                </div>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.22em", color: "#d0e8d0" }}>HACKRACT</span>
              </div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "rgba(120,150,120,0.6)", lineHeight: 1.7, maxWidth: 220 }}>
                AI-powered penetration testing platform for elite security operators.
              </p>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(100,130,100,0.45)", marginTop: 14 }}>
                © 2026 HACKRACT PLATFORMS. ALL RIGHTS RESERVED.
              </p>
            </div>

            {/* Links */}
            {[

              { heading: "Resources", links: ["Docs", "API Ref", "Changelog", "Status"] },
              { heading: "Connect", links: ["Twitter", "GitHub", "Discord", "LinkedIn"] },
            ].map((col, i) => (
              <div key={i}>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,255,157,0.5)", marginBottom: 18 }}>{col.heading}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" className="hk-nav-link" style={{ fontSize: 12, color: "rgba(140,170,140,0.6)" }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)",
            flexWrap: "wrap", gap: 12,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(100,130,100,0.4)", letterSpacing: "0.15em" }}>
              HACKRACT SECURITY PLATFORM · V2.4.1_STABLE
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 8px #00ff9d", display: "inline-block", animation: "pulseGlow 2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#00ff9d" }}>System Operational · All Services Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
