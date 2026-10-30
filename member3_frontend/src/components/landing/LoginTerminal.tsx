"use client";

import React, { useState, useEffect } from "react";
import { AgentType } from "@/types/events";
import { zenAudio } from "@/lib/zen-audio";
import { authStorage } from "@/lib/auth-storage";
import { Mail, Lock, Eye, EyeOff, Check, ArrowRight, ArrowLeft } from "lucide-react";

interface LoginTerminalProps {
  onLoginSuccess: (agent: AgentType, operatorName: string) => void;
  onBackToTemple: () => void;
}

export function LoginTerminal({ onLoginSuccess, onBackToTemple }: LoginTerminalProps) {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [email, setEmail] = useState("operator@devpilot.ai");
  const [password, setPassword] = useState("temple-night-2026");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check internal storage on mount
  useEffect(() => {
    const session = authStorage.getSession();
    if (session?.email) {
      setEmail(session.email);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    zenAudio.playChime(660);

    setTimeout(() => {
      const user = mode === "signin" ? authStorage.signIn(email) : authStorage.signUp(email);
      onLoginSuccess("samurai", user.name);
    }, 450);
  };

  const handleSocialLogin = (provider: "google" | "github") => {
    setIsSubmitting(true);
    zenAudio.playChime(528);

    setTimeout(() => {
      const user = authStorage.socialLogin(provider);
      onLoginSuccess("samurai", user.name);
    }, 450);
  };

  return (
    <div className="relative w-full max-w-[440px] mx-auto select-none">
      {/* Decorative Autumn Red Maple Leaf Accents */}
      <div className="absolute -top-4 -right-3 pointer-events-none z-10 w-9 h-9 text-rose-500/80 drop-shadow-[0_2px_8px_rgba(225,29,72,0.6)] rotate-12">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.5 7.5L18 5L15.5 10L21 11.5L16 14L19 18.5L13.5 16.5L12 22L10.5 16.5L5 18.5L8 14L3 11.5L8.5 10L6 5L10.5 7.5L12 2Z" />
        </svg>
      </div>

      <div className="absolute bottom-8 -right-4 pointer-events-none z-10 w-8 h-8 text-rose-600/90 drop-shadow-[0_2px_10px_rgba(225,29,72,0.7)] rotate-45">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.5 7.5L18 5L15.5 10L21 11.5L16 14L19 18.5L13.5 16.5L12 22L10.5 16.5L5 18.5L8 14L3 11.5L8.5 10L6 5L10.5 7.5L12 2Z" />
        </svg>
      </div>

      <div className="absolute top-2/3 -left-4 pointer-events-none z-10 w-7 h-7 text-red-600/70 drop-shadow-[0_2px_8px_rgba(225,29,72,0.5)] -rotate-12">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.5 7.5L18 5L15.5 10L21 11.5L16 14L19 18.5L13.5 16.5L12 22L10.5 16.5L5 18.5L8 14L3 11.5L8.5 10L6 5L10.5 7.5L12 2Z" />
        </svg>
      </div>

      {/* Back to Temple button in top-left */}
      <button
        onClick={onBackToTemple}
        className="absolute -top-10 left-1 inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Temple</span>
      </button>

      {/* Main Glassmorphic Modal Card */}
      <div className="relative rounded-[20px] bg-[#0b0c10]/92 border border-amber-900/40 p-7 sm:p-8 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(153,27,27,0.18)] transition-all">
        {/* Subtle inner top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        {/* Top Pill Badge */}
        <div className="flex justify-center mb-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b140b]/85 border border-[#8a531d]/50 text-[10px] sm:text-[11px] font-mono tracking-widest text-[#d97706] uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <span>KYOTO MOUNTAIN TEMPLE</span>
          </div>
        </div>

        {/* Title: TEMPLE NIGHT */}
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-[0.18em] text-slate-100 uppercase text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}
        >
          TEMPLE NIGHT
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-[13px] text-zinc-400/90 text-center tracking-wide mt-1 mb-5">
          Begin your journey
        </p>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#121319]/90 border border-zinc-800/80 mb-5">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-[#251e13] border border-[#b45309]/40 text-[#fde68a] shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              mode === "create"
                ? "bg-[#251e13] border border-[#b45309]/40 text-[#fde68a] shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Input */}
          <div className="relative flex items-center bg-[#090a0f]/90 border border-zinc-800/80 focus-within:border-amber-600/70 focus-within:ring-1 focus-within:ring-amber-600/20 rounded-xl px-3.5 py-3 transition-all">
            <Mail className="w-4 h-4 text-zinc-500 shrink-0 mr-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>

          {/* Password Input */}
          <div className="relative flex items-center bg-[#090a0f]/90 border border-zinc-800/80 focus-within:border-amber-600/70 focus-within:ring-1 focus-within:ring-amber-600/20 rounded-xl px-3.5 py-3 transition-all">
            <Lock className="w-4 h-4 text-zinc-500 shrink-0 mr-3" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs pt-1 pb-1 px-0.5">
            <label
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 hover:text-zinc-300"
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                  rememberMe
                    ? "bg-[#d97706] border border-amber-400 text-black shadow-[0_0_8px_rgba(217,119,6,0.4)]"
                    : "border border-zinc-700 bg-zinc-900/80 text-transparent"
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => alert("Password reset link will be sent to your email.")}
              className="text-[#d97706] hover:text-amber-400 transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button (Crimson Red Gradient with Velvet Glow) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 rounded-xl font-semibold text-xs sm:text-sm tracking-widest uppercase text-white transition-all flex items-center justify-center gap-2 border border-red-500/50 shadow-[0_0_22px_rgba(220,38,38,0.45)] hover:shadow-[0_0_32px_rgba(239,68,68,0.65)] hover:border-red-400 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            style={{
              background: "linear-gradient(90deg, #6c110f 0%, #a41c19 50%, #6c110f 100%)",
            }}
          >
            <span>
              {isSubmitting
                ? "AUTHENTICATING..."
                : mode === "signin"
                ? "SIGN IN →"
                : "CREATE ACCOUNT →"}
            </span>
          </button>
        </form>

        {/* Divider: OR CONTINUE WITH */}
        <div className="relative flex items-center justify-center my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800/80" />
          </div>
          <span className="relative bg-[#0b0c10] px-3 text-[10px] font-mono tracking-widest text-zinc-500 uppercase select-none">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Social Buttons: Google & GitHub */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-[#090a0f]/90 border border-zinc-800/80 hover:bg-[#141620] hover:border-zinc-700 text-xs font-medium text-zinc-200 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin("github")}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-[#090a0f]/90 border border-zinc-800/80 hover:bg-[#141620] hover:border-zinc-700 text-xs font-medium text-zinc-200 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Footer: Don't have an account? Create one -> */}
        <div className="text-center text-xs text-zinc-400">
          <span>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</span>{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "create" : "signin")}
            className="text-[#d97706] hover:text-amber-400 font-medium ml-1 transition-colors cursor-pointer"
          >
            {mode === "signin" ? "Create one →" : "Sign In →"}
          </button>
        </div>
      </div>
    </div>
  );
}
