"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Shield, Loader2, CheckCircle2, Eye, EyeOff, Lock, Save, MapPin, Bell, BellOff, Palette, Check, Tag, Plus, X, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme, AppTheme } from "@/context/ThemeContext";
import { getInitials } from "@/lib/utils";

const themes: { id: AppTheme; name: string; description: string; preview: { bg: string; sidebar: string; accent: string } }[] = [
  {
    id: "emerald-slate",
    name: "Emerald Slate",
    description: "Light theme with slate tones and emerald accents",
    preview: { bg: "#f8fafc", sidebar: "#0f172a", accent: "#10b981" },
  },
  {
    id: "midnight-glass",
    name: "Midnight Glass",
    description: "Dark glass theme with cyan highlights",
    preview: { bg: "#020617", sidebar: "#0f172a", accent: "#06b6d4" },
  },
  {
    id: "ivory-corporate",
    name: "Ivory Corporate",
    description: "Warm corporate look with branded green",
    preview: { bg: "#fafaf9", sidebar: "#0f2d23", accent: "#18c37e" },
  },
];

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Category management state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryAdding, setCategoryAdding] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const checkPushStatus = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushSupported(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    } catch {
      // Push not available
    }
  }, []);

  useEffect(() => {
    checkPushStatus();
  }, [checkPushStatus]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.categories || []);
    } catch {
      // silent
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchCategories();
  }, [user?.role, fetchCategories]);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryError("");
    setCategoryAdding(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewCategoryName("");
      fetchCategories();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setCategoryAdding(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryError("");
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchCategories();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const handlePushToggle = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
        setPushEnabled(true);
      }
    } catch (err) {
      console.error("Push toggle error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfileMessage("Profile updated successfully");
      refreshUser();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPasswordMessage("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const { theme, setTheme } = useAppTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-xl lg:text-2xl font-bold mb-1 tracking-tight" style={{ color: "var(--foreground)" }}>Settings</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--muted)" }}>Manage your account and preferences</p>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="premium-card p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Profile</h3>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-hover))`, boxShadow: `0 10px 15px -3px var(--nav-active-shadow)` }}>
              {user ? getInitials(user.firstName, user.lastName) : "??"}
            </div>
            <div>
              <h4 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                {user?.firstName} {user?.lastName}
              </h4>
              <p className="text-[var(--muted)]">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  {user?.role === "ADMIN" ? "Administrator" : "Employee"}
                </span>
                {user?.branch && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    <MapPin className="w-3 h-3" /> {user.branch.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl input-premium text-[var(--foreground)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl input-premium text-[var(--foreground)]"
                  required
                />
              </div>
            </div>
            {profileError && <p className="text-sm text-red-500">{profileError}</p>}
            {profileMessage && <p className="text-sm text-green-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{profileMessage}</p>}

            <motion.button whileTap={{ scale: 0.99 }} type="submit" disabled={profileSaving} className="flex items-center gap-2 px-5 py-2.5 btn-primary text-sm disabled:opacity-60">
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {profileSaving ? "Saving..." : "Save Changes"}
            </motion.button>
          </form>
        </div>

        {/* Theme Picker */}
        <div className="premium-card p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Appearance</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative rounded-xl border-2 p-3 transition-all text-left ${
                  theme === t.id ? "" : "hover:scale-[1.02]"
                }`}
                style={{
                  borderColor: theme === t.id ? "var(--accent)" : "var(--card-border)",
                  background: "var(--subtle)",
                  outline: theme === t.id ? "2px solid var(--accent)" : undefined,
                  outlineOffset: theme === t.id ? "2px" : undefined,
                }}
              >
                {theme === t.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="rounded-lg overflow-hidden mb-3 border" style={{ borderColor: "var(--card-border)" }}>
                  <div className="flex h-20">
                    <div className="w-8" style={{ background: t.preview.sidebar }} />
                    <div className="flex-1 p-2" style={{ background: t.preview.bg }}>
                      <div className="w-full h-2 rounded-full mb-1.5" style={{ background: t.preview.accent, opacity: 0.3 }} />
                      <div className="w-3/4 h-1.5 rounded-full mb-1" style={{ background: t.preview.sidebar, opacity: 0.15 }} />
                      <div className="w-1/2 h-1.5 rounded-full mb-2" style={{ background: t.preview.sidebar, opacity: 0.1 }} />
                      <div className="flex gap-1">
                        <div className="flex-1 h-6 rounded" style={{ background: t.preview.accent, opacity: 0.15 }} />
                        <div className="flex-1 h-6 rounded" style={{ background: t.preview.accent, opacity: 0.1 }} />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{t.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <div className="premium-card p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Change Password</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full h-10 pl-10 pr-10 rounded-xl input-premium text-[var(--foreground)]"
                  required
                />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full h-10 pl-10 pr-4 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="w-full h-10 pl-10 pr-4 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400"
                    required
                  />
                </div>
              </div>
            </div>

            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-green-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{passwordMessage}</p>}

            <motion.button whileTap={{ scale: 0.99 }} type="submit" disabled={passwordSaving} className="flex items-center gap-2 px-5 py-2.5 btn-primary text-sm disabled:opacity-60">
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {passwordSaving ? "Changing..." : "Change Password"}
            </motion.button>
          </form>
        </div>
        {/* Push Notifications */}
        {pushSupported && (
          <div className="premium-card p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Push Notifications</h3>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">
              Get notified when expenses are submitted, approved, or rejected — even when the app is closed.
            </p>
            <div className="flex items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={handlePushToggle}
                disabled={pushLoading}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl font-medium transition-colors ${
                  pushEnabled
                    ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900"
                    : "btn-primary"
                } disabled:opacity-60`}
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pushEnabled ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {pushLoading ? "Processing..." : pushEnabled ? "Disable Notifications" : "Enable Notifications"}
              </motion.button>
              {pushEnabled && (
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Active
                </span>
              )}
            </div>
          </div>
        )}
        {/* Category Management (Admin only) */}
        {user?.role === "ADMIN" && (
          <div className="premium-card p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5" style={{ color: "var(--accent)" }} />
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Expense Categories</h3>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">
              Manage expense categories available for all users. Default categories cannot be deleted.
            </p>

            {categoryError && (
              <p className="text-sm text-red-500 mb-3">{categoryError}</p>
            )}

            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors"
                    style={{ borderColor: "var(--card-border)", background: "var(--subtle)" }}
                  >
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {cat.name}
                      {cat.isDefault && (
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                          Default
                        </span>
                      )}
                    </span>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="New category name..."
                className="flex-1 h-10 px-4 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400 text-sm"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAddCategory}
                disabled={categoryAdding || !newCategoryName.trim()}
                className="flex items-center gap-1.5 px-4 h-10 btn-primary text-sm rounded-xl disabled:opacity-60"
              >
                {categoryAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
