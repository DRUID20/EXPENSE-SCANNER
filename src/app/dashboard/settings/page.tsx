"use client";

import { motion } from "framer-motion";
import { Settings, User, Bell, Shield, Palette } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Manage your account and preferences
      </p>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h3>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-500/20">
              {user ? getInitials(user.firstName, user.lastName) : "??"}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </h4>
              <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-xs font-semibold">
                {user?.role === "ADMIN" ? "Administrator" : user?.role === "MANAGER" ? "Manager" : "Employee"}
              </span>
            </div>
          </div>
        </div>

        {/* Settings sections placeholder */}
        {[
          { title: "Notifications", icon: Bell, desc: "Configure email and push notifications" },
          { title: "Security", icon: Shield, desc: "Password, two-factor authentication" },
          { title: "Appearance", icon: Palette, desc: "Theme, language, and display preferences" },
        ].map((section) => (
          <div
            key={section.title}
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <section.icon className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{section.desc}</p>
            <p className="mt-3 text-xs text-gray-400">Coming soon</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
