import React from "react";
import { Outlet } from "react-router-dom";

const OnboardingLayout = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background Matrix/Grid effect */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGF0b20gZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDM5LjVsNDAtLjBNMzkuNSAwdi00MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] opacity-20 z-0 pointer-events-none"></div>
      
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 bg-black/40 backdrop-blur z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-[#00c477]/20 border border-[#00c477]/40 flex items-center justify-center text-[#00c477] font-bold font-mono">
            λ
          </div>
          <div className="text-lg font-mono font-bold tracking-[0.2em] pointer-events-none">HACKRACT</div>
        </div>
        <div className="ml-auto text-xs font-mono text-gray-400 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]"></span>
            Setup Sequence Init
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center z-10 p-6 md:p-12 w-full max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default OnboardingLayout;
