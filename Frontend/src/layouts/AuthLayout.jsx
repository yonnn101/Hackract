import { Outlet, useLocation, Link } from "react-router-dom";
import MatrixRain from "../components/MatrixRain";

const AuthLayout = () => {
    const location = useLocation();
    const isLogin = location.pathname === "/login";
    const label = isLogin ? "login__" : "register__";

    return (
        <div className="flex min-h-screen w-full font-mono bg-white text-gray-900">
            {/* Left Side - Matrix Background */}
            <div className="relative hidden w-1/2 md:flex flex-col p-4">
                <div className="relative flex-1 bg-black text-[#00c477] overflow-hidden rounded-[2.5rem] w-full h-full shadow-2xl">
                    <MatrixRain />

                    {/* Overlay Content */}
                    <div className="relative z-10 flex flex-col h-full justify-between p-12 pointer-events-none select-none">
                        <div className="text-xl font-bold tracking-wider hover:text-white transition-colors duration-300 cursor-default">
                            {label}
                        </div>

                        <div className="flex flex-col gap-4 max-w-md">
                            <h1 className="text-5xl font-bold leading-tight hover:translate-x-2 transition-transform duration-500 cursor-default text-white">
                                Rewrite the <br /> Rules
                            </h1>
                            <p className="text-sm opacity-80 leading-relaxed font-light text-gray-400">
                                Systems bend to <br />
                                those who understand them.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form Container */}
            <div className="flex w-full md:w-1/2 flex-col justify-center items-center p-8 md:p-16 bg-white relative">

                {/* ← Back to Home */}
                <Link
                    to="/"
                    className="absolute top-6 left-8 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors duration-200 group"
                >
                    <svg
                        className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-200"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                    >
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Home
                </Link>

                <div className="absolute top-8 md:top-12 text-center uppercase tracking-[0.2em] font-bold text-lg md:text-xl font-sans hover:tracking-[0.3em] transition-all duration-500 cursor-pointer select-none text-black">
                    HACKRACT
                </div>

                <div className="w-full max-w-md mt-12 md:mt-0">
                    <Outlet />
                </div>
            </div>

        </div>
    );
};

export default AuthLayout;
