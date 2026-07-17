import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import api from "../api/axiosConfig";

const StatusBadge = ({ status, children }) => {
  const colors = {
    loading: "bg-amber-100 text-amber-700 border-amber-200",
    success: "bg-green-100 text-green-800 border-green-200",
    error: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`text-xs font-mono px-2 py-1 rounded border ${colors[status]}`}>{children}</span>
  );
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Enter the 6-digit code we emailed you.");
  const tokenFromUrl = useMemo(() => {
    const t = searchParams.get("token");
    return t ? String(t).trim() : "";
  }, [searchParams]);

  const initialEmail = useMemo(() => {
    const emailFromUrl = searchParams.get("email");
    const emailFromState = location?.state?.email;
    return typeof emailFromState === "string" ? emailFromState : (emailFromUrl || "");
  }, [location?.state?.email, searchParams]);

  const [form, setForm] = useState({ email: initialEmail, code: tokenFromUrl || "" });
  const [countdown, setCountdown] = useState(20);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      email: prev.email || initialEmail,
      code: prev.code || tokenFromUrl,
    }));
  }, [initialEmail, tokenFromUrl]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!form.email) {
      toast.error("Please provide an email to resend the code.");
      return;
    }
    setIsResending(true);
    setStatus("loading");
    setMessage("Resending code...");
    try {
      const { data } = await api.post("/auth/resend-verification", { email: form.email });
      setCountdown(20);
      setStatus("success");
      const msg = data?.message || "Verification code resent!";
      setMessage(msg);
      toast.success(msg);
    } catch (error) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to resend. Please try again.";
      setStatus("error");
      setMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("Verifying...");
    try {
      const payload = { email: form.email, token: form.code };
      const { data } = await api.post("/auth/verify-email", payload);
      setStatus("success");
      const successMsg = data?.message || "Email verified! You can now log in.";
      setMessage(successMsg);
      toast.success(successMsg);
      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Verification failed. Please request a new code.";
      setStatus("error");
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold font-mono tracking-tighter">Verify email</h2>
        <p className="text-gray-500 text-xs font-mono tracking-wide">
          Completing verification secures your account.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={status === "idle" ? "loading" : status}>{status || "loading"}</StatusBadge>
        <p className="text-sm font-mono text-gray-800">{message}</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest uppercase text-gray-500 font-sans">Email</label>
          <div className="flex items-center w-full bg-gray-100 rounded-sm px-3 py-3 border border-transparent focus-within:border-black transition-all duration-300">
            <span className="text-xs font-mono text-gray-500 mr-2 select-none">root@hackract:~$</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="flex-1 bg-transparent outline-none text-sm font-mono placeholder-gray-400 text-gray-900 cursor-text"
              placeholder="username@domain.com"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest uppercase text-gray-500 font-sans">6-digit access code</label>
          <div className="flex items-center w-full bg-gray-100 rounded-sm px-3 py-3 border border-transparent focus-within:border-black transition-all duration-300">
            <span className="text-xs font-mono text-gray-500 mr-2 select-none">otp_verify:</span>
            <input
              type="text"
              name="code"
              value={form.code}
              onChange={handleChange}
              required
              pattern="\d{6}"
              maxLength={6}
              className="flex-1 bg-transparent outline-none text-sm font-mono tracking-[0.8em] font-bold text-center placeholder-gray-400 text-gray-900 cursor-text"
              placeholder="000000"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-black text-[#00c477] font-mono font-bold py-3 uppercase tracking-widest hover:bg-[#00c477] hover:text-black transition-all duration-300 mt-2 cursor-pointer shadow-lg disabled:opacity-60"
        >
          {status === "loading" && !isResending ? "Validating..." : "Execute Verification"}
        </button>

        <button
          type="button"
          disabled={countdown > 0 || isResending}
          onClick={handleResend}
          className="w-full bg-transparent text-gray-900 border border-gray-900 font-mono font-bold py-3 uppercase tracking-widest hover:bg-gray-100 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending ? "Resending..." : countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
        </button>
      </form>

      <div className="flex flex-col gap-3 text-xs font-mono text-gray-600">
        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 bg-black text-[#00c477] rounded-sm font-bold uppercase tracking-widest hover:bg-[#00c477] hover:text-black transition-all duration-300"
          >
            Go to login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 border border-gray-900 text-gray-900 rounded-sm font-bold uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all duration-300"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
