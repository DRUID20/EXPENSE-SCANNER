"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Zap, ArrowLeft, CheckCircle2, Copy } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      if (data.resetUrl) {
        setResetUrl(window.location.origin + data.resetUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white dark:bg-[#061B09]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px]"
      >
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">GASCO</h1>
            <p className="text-[10px] text-emerald-500 tracking-[0.2em] font-semibold">ENERGY</p>
          </div>
        </div>

        {!success ? (
          <>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
              Forgot password?
            </h3>
            <p className="text-[14px] text-gray-400 mb-7">
              Enter your email and we&apos;ll generate a reset link
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
                    Generate Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Reset link generated
            </h3>
            <p className="text-[14px] text-gray-400 mb-6">
              Share this link with the user to reset their password. The link expires in 1 hour.
            </p>

            {resetUrl && (
              <div className="mb-6">
                <div className="flex items-center gap-2 p-3 rounded-xl input-premium">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{resetUrl}</p>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <Link href="/login" className="flex items-center gap-2 justify-center mt-7 text-[13px] text-gray-400 hover:text-emerald-500">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
