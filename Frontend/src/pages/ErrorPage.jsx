import { useRouteError, Link } from "react-router-dom";
import NotFound from "./NotFound.jsx";

const ErrorPage = () => {
    const error = useRouteError();
    console.error(error);

    // If it's explicitly a 404 routing error, render the formal 404 page
    if (error?.status === 404) {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="grid grid-cols-12 h-full">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="border-r border-[#00ff41] h-full" />
                    ))}
                </div>
            </div>

            <div className="relative z-10 max-w-md w-full border border-red-500/20 bg-black/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/40">
                        <span className="text-2xl font-bold">!</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-tighter">System Error</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Fault detected in grid_</p>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg">
                        <p className="text-sm text-red-400 font-mono italic">
                            {error.statusText || error.message || "An unexpected application error occurred."}
                        </p>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        The operator console has encountered a critical exception. Connection to the primary node may have been severed or a protocol mismatch was detected.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/"
                        className="w-full bg-[#00ff41] text-black text-center py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#00cc33] transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                    >
                        Restore Basic Session
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-white/5 border border-white/10 text-white py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                    >
                        Re-establish Link
                    </button>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-gray-600 font-mono uppercase tracking-[0.2em] animate-pulse">
                Monitoring grid integrity...
            </div>
        </div>
    );
};

export default ErrorPage;
