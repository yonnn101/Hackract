import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiHome } from 'react-icons/fi';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden text-white">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00c477]/10 via-[#050505] to-[#050505] opacity-60"></div>
            
            <div className="relative z-10 max-w-2xl w-full text-center space-y-8 p-10 bg-black/60 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl">
                
                <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center text-red-500">
                        <FiAlertCircle size={32} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-[#00c477] tracking-tighter drop-shadow-sm">404</h1>
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-white">
                        Page Not Found
                    </h2>
                </div>

                <div className="w-16 h-1 bg-[#00c477]/50 mx-auto rounded-full"></div>
                
              
                
                <div className="pt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-3 bg-[#00c477]/10 border border-[#00c477]/30 hover:bg-[#00c477] text-[#00c477] hover:text-black px-8 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(0,196,119,0.1)] hover:shadow-[0_0_30px_rgba(0,196,119,0.4)] group"
                    >
                        <FiHome className="text-lg group-hover:text-black transition-colors" />
                        <span>Return to Main page</span>
                    </Link>
                </div>
            </div>
            
        </div>
    );
};

export default NotFound;