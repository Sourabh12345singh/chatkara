import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import AuthImagePattern from "../components/AuthImagePattern";
import { useAuthStore } from "../store/useAuthStore";
import { BACKEND_URL } from "../constants/api";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login, isLoggingIn, checkAuth } = useAuthStore();
  const [searchParams] = useSearchParams();

  // ============================================
  // HANDLE GOOGLE OAUTH CALLBACK
  // ============================================
  useEffect(() => {
    const googleAuth = searchParams.get("google_auth");
    if (googleAuth === "success") {
      toast.success("Logged in with Google successfully!");
      void checkAuth();
    } else if (searchParams.get("error")) {
      toast.error(searchParams.get("error") || "Google authentication failed");
    }
  }, [searchParams, checkAuth]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void login(formData);
  };

  // ============================================
  // GOOGLE LOGIN HANDLER
  // ============================================
  const handleGoogleLogin = () => {
    // Full path to backend Google OAuth - must include /api
    const googleAuthUrl = "http://localhost:5001/api/auth/google";
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="grid h-screen lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="mb-8 text-center">
            <div className="group flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h1 className="mt-2 text-2xl font-bold">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* ============================================ */}
          {/* GOOGLE LOGIN BUTTON */}
          {/* ============================================ */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-outline w-full flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-2.95-.4-4.35h-21v8.27h12.18c-.53 2.7-2.13 4.98-4.54 6.5v5.41h7.36c4.28-3.94 6.7-9.73 6.7-15.83z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.15 15.9-5.82l-7.36-5.41c-2.15 1.45-4.9 2.3-8.54 2.3-6.57 0-12.14-4.44-14.12-10.41h-7.5v5.57c4.2 8.35 12.84 13.77 21.62 13.77z"/>
              <path fill="#FBBC05" d="M9.88 28.18c-.4-.95-.63-1.97-.63-3.18s.22-2.23.63-3.18v-5.57h-7.5c-1.09 2.17-1.72 4.53-1.72 7.18s.63 5.01 1.72 7.18l7.5-5.57z"/>
              <path fill="#EA4335" d="M24 9.75c3.23 0 5.73 1.1 7.47 2.26l6.65-6.65C35.93 2.15 30.48 0 24 0 15.22 0 4.2 5.42 0 13.77l7.5 5.57c1.98-5.97 7.55-10.59 14.5-10.59z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="divider text-base-content/40">OR</div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Email</span></label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Mail className="h-5 w-5 text-base-content/40" /></div>
                <input type="email" className="input input-bordered w-full pl-10" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Password</span></label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Lock className="h-5 w-5 text-base-content/40" /></div>
                <input type={showPassword ? "text" : "password"} className="input input-bordered w-full pl-10" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-5 w-5 text-base-content/40" /> : <Eye className="h-5 w-5 text-base-content/40" />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <><Loader2 className="h-5 w-5 animate-spin" />Loading...</> : "Sign in"}
            </button>
          </form>
          <div className="text-center">
            <p className="text-base-content/60">Don&apos;t have an account? <Link to="/signup" className="link link-primary">Create account</Link></p>
          </div>
        </div>
      </div>
      <AuthImagePattern title="Welcome back!" subtitle="Sign in to continue your conversations and catch up with your messages." />
    </div>
  );
};

export default LoginPage;
