import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "../context/authContext.jsx";
import { validatePassword } from "../utils/validators";


const InputField = ({ 
  label, 
  type, 
  placeholder, 
  id, 
  name, 
  value, 
  onChange, 
  icon, 
  onIconClick, 
  required = true 
}) => (
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
        required={required}
      />
      {icon && (
        <span
          className="ml-2 cursor-pointer text-gray-500 hover:text-black"
          onClick={onIconClick}
          tabIndex={0}
          role="button"
        >
          {icon}
        </span>
      )}
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

const Register = () => {
  const { register, loading } = useAuth();
  const { loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    fullName: "",
    handle: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: {
      name: "",
    },
  });

  const [accountType, setAccountType] = useState("HACKER"); // HACKER or ORGANIZATION
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (location.pathname === "/register/organization") {
      setAccountType("ORGANIZATION");
    } else {
      setAccountType("HACKER");
    }
  }, [location.pathname]);

  const handleAccountTypeChange = (nextAccountType) => {
    setAccountType(nextAccountType);
    if (nextAccountType === "ORGANIZATION") {
      navigate("/register/organization");
    } else {
      navigate("/register/hacker");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "password") {
      if (!validatePassword(value)) {
        setPasswordError(
          "Password must be at least 8 characters, include uppercase, lowercase, and a special character."
        );
      } else {
        setPasswordError("");
      }
    }
  };

  const handleOrganizationChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      organization: {
        ...prev.organization,
        [name]: value,
      },
    }));
  };

  const handleGoogleLogin = () => {
    // persist the user's selection so we can redirect after the OAuth roundtrip
    window.localStorage.setItem('selected_account_type', accountType);
    loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!validatePassword(form.password)) {
      setPasswordError(
        "Password must be at least 8 characters, include uppercase, lowercase, and a special character."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      const payload = {
        fullName: form.fullName,
        handle: form.handle,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        accountType,
      };

      if (accountType === "ORGANIZATION") {
        if (!form.organization.name.trim()) {
          setErrorMessage("Organization name is required for organization registration.");
          return;
        }
        payload.organization = {
          name: form.organization.name,
        };
      }

      const result = await register(payload);

      setSuccessMessage(result?.message || "Registration successful. Check your email for verification code.");
      console.info("[ui] registration success", result);
      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
      }, 1500);
    } catch (err) {
      const backendError = err?.response?.data?.error || err?.response?.data?.message;
      setErrorMessage(backendError || "Registration failed. Please try again.");
      console.error("[ui] registration failed", err?.response?.data || err);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold font-mono tracking-tighter hover:text-green-500 transition-colors duration-500 cursor-default">
          Create account
        </h2>
        <p className="text-gray-500 text-xs font-mono tracking-wide">
          {accountType === "ORGANIZATION"
            ? "Register your organization account with company details"
            : "Register your hacker account with email and password"}
        </p>
      </div>

      <div className="flex gap-2 w-full">
        {[
          { id: "HACKER", label: "Hacker" },
          { id: "ORGANIZATION", label: "Organization" },
        ].map((option) => {
          const isActive = accountType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleAccountTypeChange(option.id)}
              className={`flex-1 py-2.5 border text-xs font-mono uppercase tracking-widest rounded-sm transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-black text-[#00c477] border-black shadow-lg shadow-[#00c477]/30"
                  : "bg-white text-gray-700 border-gray-300 hover:border-black hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-mono px-3 py-2 rounded">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-mono px-3 py-2 rounded">
            {errorMessage}
          </div>
        )}
        
        <InputField
          label="Full Name"
          type="text"
          id="fullName"
          name="fullName"
          placeholder="Jane Doe"
          value={form.fullName}
          onChange={handleChange}
        />
        <InputField
          label="Handle"
          type="text"
          id="handle"
          name="handle"
          placeholder="janedoe"
          value={form.handle}
          onChange={handleChange}
        />
        <InputField
          label="Email"
          type="email"
          id="email"
          name="email"
          placeholder={accountType === "ORGANIZATION" ? "name@company.com" : "username@domain.com"}
          value={form.email}
          onChange={handleChange}
        />
        <InputField
          label="Password"
          type={showPassword ? "text" : "password"}
          id="password"
          name="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
          icon={showPassword ? <FaEyeSlash /> : <FaEye />}
          onIconClick={() => setShowPassword((prev) => !prev)}
        />
        {passwordError && (
          <div className="text-red-500 text-xs font-mono mt-1">{passwordError}</div>
        )}
        <InputField
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Re-enter password"
          value={form.confirmPassword}
          onChange={handleChange}
          icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          onIconClick={() => setShowConfirmPassword((prev) => !prev)}
        />

        {accountType === "ORGANIZATION" && (
          <>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-4">Organization Details</p>
            </div>

            <InputField
              label="Organization Name"
              type="text"
              id="organizationName"
              name="name"
              placeholder="Hackract Security Labs"
              value={form.organization.name}
              onChange={handleOrganizationChange}
            />
            <p className="text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
              Organization signup requires a company email (public domains are rejected by backend).
            </p>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-[#00c477] font-mono font-bold py-3 uppercase tracking-widest hover:bg-[#00c477] hover:text-black transition-all duration-300 mt-2 cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {accountType !== "ORGANIZATION" && (
        <>
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
        </>
      )}

      <div className="text-center text-xs font-mono text-gray-500 mt-4">
        Already have an account?{" "}
        <Link to="/login" className="underline hover:text-black transition-colors font-bold uppercase">
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default Register;
