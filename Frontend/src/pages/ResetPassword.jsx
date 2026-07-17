import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing reset token. Use the link from your email.");
      return;
    }
    setLoading(true);
    try {
      const payload = { token, newPassword: form.newPassword, confirmPassword: form.confirmPassword };
      const { data } = await api.post("/auth/reset-password", payload);
      const msg = data?.message || "Password reset successful.";
      toast.success(msg);
      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || "Reset failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold font-mono tracking-tighter">Reset password</h2>
        <p className="text-gray-500 text-xs font-mono tracking-wide">Choose a new password.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest uppercase text-gray-500">New password</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            required
            className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-black"
            placeholder="At least 8 characters"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest uppercase text-gray-500">Confirm password</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-black"
            placeholder="Repeat password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-[#00c477] font-mono font-bold py-3 uppercase tracking-widest hover:bg-[#00c477] hover:text-black transition-all duration-300 mt-2 cursor-pointer shadow-lg disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <div className="text-xs font-mono text-gray-500">
        Lost your token? <Link to="/forgot-password" className="underline font-bold">Request a new one</Link>.
      </div>
    </div>
  );
};

export default ResetPassword;
