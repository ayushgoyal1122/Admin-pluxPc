import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname;
      const target = from && from !== "/admin/login" && from !== "/" ? from : "/admin/dashboard";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        const from = (location.state as any)?.from?.pathname;
        const target = from && from !== "/admin/login" && from !== "/" ? from : "/admin/dashboard";
        navigate(target, { replace: true });
      } else {
        setError(res.message || "Invalid email or password");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col justify-center items-center px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-2">
            <img
              src="/pluxpc-logo.png"
              alt="PLUXPC logo"
              className="h-9 w-auto max-w-[180px] object-contain"
            />
          </Link>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#BFC5CE] text-xs font-semibold text-[#374151] shadow-xs">
              <ShieldCheck size={14} className="text-gray-700" />
              <span>Admin Control Center</span>
            </span>
          </div>
        </div>

        {/* Login Card (Clean White & Grey) */}
        <div className="bg-white border border-[#C5C9D0] rounded-xl shadow-2xs p-8">
          <h1 className="text-xl font-bold text-[#1F2937] mb-1.5">Sign in to Admin Dashboard</h1>
          <p className="text-xs text-[#6B7280] mb-6">
            Enter your administrator credentials to access catalog management and analytics.
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@youngdecade.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-[#BFC5CE] rounded-lg text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((o) => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to Storefront Link */}
        <div className="text-center mt-6">
          <a
            href="http://localhost:5173"
            className="text-xs font-medium text-[#6B7280] hover:text-[#1F2937] transition-colors"
          >
            &larr; Return to PLUXPC Customer Storefront
          </a>
        </div>
      </div>
    </div>
  );
}
