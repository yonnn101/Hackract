import { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      const msg = data?.message || "If an account exists, a reset link has been sent.";
      toast.success(msg);
    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || "Unable to send reset email.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold font-mono tracking-tighter">Forgot password</h2>
        <p className="text-gray-500 text-xs font-mono tracking-wide">We'll email you a reset link.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest uppercase text-gray-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-black"
            placeholder="username@domain.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-[#00c477] font-mono font-bold py-3 uppercase tracking-widest hover:bg-[#00c477] hover:text-black transition-all duration-300 mt-2 cursor-pointer shadow-lg disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
