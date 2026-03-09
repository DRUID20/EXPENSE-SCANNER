"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Zap, Building, MapPin } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "EMPLOYEE",
    branchId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string; location: string }[]>([]);

  useEffect(() => {
    fetch("/api/branches/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) setBranches(data.branches);
      })
      .catch(() => {});
  }, []);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        branchId: form.branchId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0b0f]">
        <div className="absolute inset-0">
          <div className="absolute top-32 right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-32 left-20 w-72 h-72 bg-amber-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-14">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">GASCO</h1>
                <p className="text-[10px] text-orange-400/80 tracking-[0.3em] font-medium">ENERGY</p>
              </div>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] mb-5 tracking-tight">
              Join Your
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Team Today
              </span>
            </h2>

            <p className="text-base text-gray-500 max-w-sm leading-relaxed mb-10">
              Get started with intelligent expense management. Scan, submit, and track effortlessly.
            </p>

            {/* Steps */}
            <div className="space-y-4">
              {[
                { step: "01", text: "Create your account" },
                { step: "02", text: "Scan your first receipt" },
                { step: "03", text: "Let AI do the rest" },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-400 font-bold text-xs">
                    {item.step}
                  </div>
                  <span className="text-[14px] text-gray-400">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 bg-white dark:bg-[#08090d]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">GASCO</h1>
              <p className="text-[10px] text-orange-500 tracking-[0.2em] font-semibold">ENERGY</p>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create account
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Start managing your expenses smarter
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateForm("firstName", e.target.value)}
                    placeholder="John"
                    required
                    className="w-full h-11 pl-10 pr-3 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Last name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateForm("lastName", e.target.value)}
                    placeholder="Doe"
                    required
                    className="w-full h-11 pl-10 pr-3 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="you@gascoenergy.com"
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Role
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={form.role}
                  onChange={(e) => updateForm("role", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Branch
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={form.branchId}
                  onChange={(e) => updateForm("branchId", e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none"
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => updateForm("confirmPassword", e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full h-11 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
