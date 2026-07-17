import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "../context/authContext.jsx";
import PasswordField from "../components/PasswordField.jsx";

const InputField = ({ label, type, placeholder, id, name, value, onChange }) => (
    <div className="flex flex-col gap-2 group">
        <label
            htmlFor={id}
            className="text-xs font-bold tracking-widest uppercase text-gray-500 font-sans cursor-pointer"
        >
            {label}
        </label>
        <div className="flex items-center w-full bg-gray-100 rounded-sm px-3 py-3 border border-transparent focus-within:border-black transition-all duration-300">
            <span className="text-xs font-mono text-gray-500 mr-2 select-none">root@hackract:~$</span>
            <input
                type={type}
                id={id}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={name}
                className="flex-1 bg-transparent outline-none text-sm font-mono placeholder-gray-400 text-gray-900 cursor-text"
                required
            />
        </div>
    </div>
);

const SocialButton = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-sm py-2.5 hover:bg-gray-100 hover:border-black transition-all duration-300 cursor-pointer active:scale-95"
    >
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-mono font-bold tracking-wide">{label}</span>
    </button>
);

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginWithRedirect } = useAuth0();
    const { login, loading } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });

    const redirectTo = location.state?.from?.pathname || "/dashboard";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const result = await login(form);
            const primaryRole = result?.user?.roles?.[0]?.type;
            if (result?.requiresEmailVerification) {
                navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
                return;
            }
            // Role-based dashboard redirect
            const dashboardMap = {
                ORG_ADMIN: '/dashboard',
                PROJECT_ADMIN: '/admin-dashboard',
                PENTESTER: '/hacker-dashboard',
            };
            const destination = dashboardMap[primaryRole] || '/hacker-dashboard';
            navigate(destination, { replace: true });
        } catch (error) {
            const errorCode = error?.response?.data?.code;
            const status = error?.response?.status;
            // toast handled in context
            if (errorCode === 'EMAIL_NOT_VERIFIED' || status === 403) {
                setTimeout(() => {
                    navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
                }, 1500);
            }
        }
    };

    const handleGoogleLogin = () => {
        // default social login from the login page to HACKER flow
        window.localStorage.setItem('selected_account_type', 'HACKER');
        loginWithRedirect({
            authorizationParams: {
                connection: 'google-oauth2',
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
        });
    };

    const handleGithubLogin = () => {
        // removed GitHub option — keep behavior consistent with Google
        window.localStorage.setItem('selected_account_type', 'HACKER');
        loginWithRedirect({
            authorizationParams: {
                connection: 'google-oauth2',
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
        });
    };

    return (
        <div className="flex flex-col gap-8 w-full">
            <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold font-mono tracking-tighter hover:text-green-500 transition-colors duration-500 cursor-default">Welcome back</h2>
                <p className="text-gray-500 text-xs font-mono tracking-wide">
                    Enter your email and password to access your account
                </p>
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <InputField
                    label="Email"
                    type="email"
                    id="email"
                    name="email"
                    placeholder="username@domain.com"
                    value={form.email}
                    onChange={handleChange}
                />
                
                <div className="flex flex-col gap-2 group">
                    <label
                        htmlFor="password"
                        className="text-xs font-bold tracking-widest uppercase text-gray-500 font-sans cursor-pointer"
                    >
                        Password
                    </label>
                    <PasswordField
                        value={form.password}
                        onChange={handleChange}
                    />
                </div>

                <div className="text-right text-[11px] font-mono text-gray-500">
                    <Link to="/forgot-password" size="sm" className="underline hover:text-black transition-colors font-bold uppercase">
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-[#00c477] font-mono font-bold py-3 uppercase tracking-widest hover:bg-[#00c477] hover:text-black transition-all duration-300 mt-2 cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? "Authorizing..." : "Login"}
                </button>
            </form>

            <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200"></div>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">or connect via</span>
                <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="flex gap-4 w-full">
                <div className="w-full">
                    <SocialButton
                        icon={<FcGoogle />}
                        label="Google"
                        onClick={handleGoogleLogin}
                    />
                </div>
            </div>

            <div className="text-center text-xs font-mono text-gray-500 mt-4">
                New here?{" "}
                <Link to="/register/hacker" className="underline hover:text-black transition-colors font-bold uppercase">
                    Create account
                </Link>
            </div>
        </div>
    );
};

export default Login;
