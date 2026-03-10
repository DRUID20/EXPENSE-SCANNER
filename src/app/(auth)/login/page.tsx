"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

// Fading images carousel
function FadingImages() {
  const images = [
    { src: "/login/ugx-3.png", alt: "Ugandan Shillings" },
    { src: "/login/ugx-1.png", alt: "Ugandan Shillings" },
    { src: "/login/ugx-2.png", alt: "Ugandan Shillings" },
    { src: "/login/ugx-4.png", alt: "Ugandan Shillings" },
    { src: "/login/ugx-5.png", alt: "Ugandan Shillings" },
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#061B09] via-[#061B09]/40 to-transparent z-10" />
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.7, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${images[current].src})` }}
        />
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding with animations */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#061B09]">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[120px]"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/5 rounded-full blur-[120px]"
            animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-green-300/5 rounded-full blur-[100px]"
            animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }} />
        </div>

        {/* Background fading images */}
        <FadingImages />

        <div className="relative z-20 flex flex-col justify-end h-full px-12 xl:px-16 py-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-14">
              <Image src="/GASCO LOGO OFFI.png" alt="GASCO Logo" width={48} height={48} className="rounded-2xl" />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">GASCO</h1>
                <p className="text-[10px] text-emerald-400/80 tracking-[0.3em] font-medium">ENERGY</p>
              </div>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] mb-5 tracking-tight">
              Smart Expense
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Tracking
              </span>
            </h2>

            <p className="text-base text-gray-300/80 max-w-sm leading-relaxed mb-8">
              AI-powered receipt scanning, automatic categorization, and seamless approval workflows.
            </p>

            <div className="flex flex-wrap gap-2">
              {["AI Receipt Scanning", "Auto-Categorize", "Approval Flow", "Real-time Analytics"].map(
                (feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="px-3.5 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/[0.08] text-[13px] text-gray-300"
                  >
                    {feature}
                  </motion.div>
                )
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-gray-50 dark:bg-[#061B09]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Image src="/GASCO LOGO OFFI.png" alt="GASCO Logo" width={40} height={40} className="rounded-xl" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">GASCO</h1>
              <p className="text-[9px] text-emerald-500 tracking-[0.2em] font-medium">ENERGY</p>
            </div>
          </div>

          {/* Credentials card - slightly brighter */}
          <div className="bg-white dark:bg-[#0f3d22] rounded-2xl p-7 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-emerald-500/20">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
              Welcome back
            </h3>
            <p className="text-[14px] text-gray-400 mb-7">
              Sign in to your expense tracker
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30 text-red-600 dark:text-red-400 text-[13px]"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gascoenergy.com"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 dark:bg-[#0c3520] border border-gray-200 dark:border-emerald-700/40 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-gray-50 dark:bg-[#0c3520] border border-gray-200 dark:border-emerald-700/40 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[13px] text-gray-500">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-[13px] text-emerald-500 hover:text-emerald-600 font-medium">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full h-11 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          <p className="mt-7 text-center text-[13px] text-gray-400">
            Don&apos;t have an account? Contact your administrator.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
