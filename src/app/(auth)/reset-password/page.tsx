"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Reset Link</h3>
        <p className="text-gray-400 mb-6">This reset link is invalid or has expired.</p>
        <Link href="/login" className="text-emerald-500 hover:text-emerald-600 font-semibold text-sm">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h3>
        <p className="text-gray-400 mb-6">Your password has been successfully updated.</p>
        <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 btn-primary text-sm">
          Sign In <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
        Reset your password
      </h3>
      <p className="text-[14px] text-gray-400 mb-7">
        Enter your new password below
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
        <div>
          <label className="block text-[13px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full h-11 pl-10 pr-11 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

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
              Reset Password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white dark:bg-[#061B09]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px]"
      >
        <div className="flex items-center gap-3 mb-10">
          <Image src="/GASCO LOGO OFFI.png" alt="GASCO Logo" width={40} height={40} className="rounded-xl" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">GASCO</h1>
            <p className="text-[10px] text-emerald-500 tracking-[0.2em] font-semibold">ENERGY</p>
          </div>
        </div>

        <Suspense fallback={<div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
