"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  UserCircle,
  Loader2,
  ChevronDown,
  DollarSign,
  Building2,
  ToggleLeft,
  ToggleRight,
  X,
  ScrollText,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  isActive: boolean;
  spendingLimit: number | null;
  createdAt: string;
  _count: { expenses: number };
}

interface Policy {
  id: string;
  name: string;
  maxAmount: number;
  category: string | null;
  role: string | null;
  requireApproval: boolean;
  isActive: boolean;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  userId: string;
  user: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

const DEPARTMENTS = ["Operations", "Engineering", "Finance", "Marketing", "HR", "Field Services", "Logistics"];
const ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"];
const roleIcons: Record<string, React.ElementType> = {
  ADMIN: ShieldCheck,
  MANAGER: Shield,
  EMPLOYEE: UserCircle,
};
const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
  MANAGER: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
  EMPLOYEE: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

type Tab = "users" | "policies" | "audit";

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", firstName: "", lastName: "", role: "EMPLOYEE", department: "", password: "", spendingLimit: "" });
  const [policyForm, setPolicyForm] = useState({ name: "", maxAmount: "", category: "", role: "", requireApproval: true });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      if (res.ok) setPolicies(data.policies);
    } catch (err) {
      console.error("Failed to fetch policies:", err);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (res.ok) setAuditLogs(data.logs);
    } catch (err) {
      console.error("Failed to fetch audit:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchPolicies(), fetchAudit()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchPolicies, fetchAudit]);

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName || !inviteForm.password) {
      alert("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        setShowInvite(false);
        setInviteForm({ email: "", firstName: "", lastName: "", role: "EMPLOYEE", department: "", password: "", spendingLimit: "" });
        fetchUsers();
        fetchAudit();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    } catch {
      alert("Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchUsers();
        fetchAudit();
      }
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const handleCreatePolicy = async () => {
    if (!policyForm.name || !policyForm.maxAmount) {
      alert("Name and max amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyForm),
      });
      if (res.ok) {
        setShowPolicy(false);
        setPolicyForm({ name: "", maxAmount: "", category: "", role: "", requireApproval: true });
        fetchPolicies();
        fetchAudit();
      }
    } catch {
      alert("Failed to create policy");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm("Delete this policy?")) return;
    try {
      await fetch("/api/policies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchPolicies();
      fetchAudit();
    } catch (err) {
      console.error("Failed to delete policy:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage users, policies, and view audit logs
          </p>
        </div>
        {tab === "users" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </motion.button>
        )}
        {tab === "policies" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPolicy(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
          >
            <Plus className="w-4 h-4" />
            Add Policy
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-6 w-fit">
        {([
          { id: "users" as Tab, label: "Users", icon: Users },
          { id: "policies" as Tab, label: "Policies", icon: Shield },
          { id: "audit" as Tab, label: "Audit Log", icon: ScrollText },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <div className="space-y-3">
          <AnimatePresence>
            {users.map((u, i) => {
              const RoleIcon = roleIcons[u.role] || UserCircle;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{u.firstName} {u.lastName}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                          <RoleIcon className="w-3 h-3" />
                          {u.role}
                        </span>
                        {!u.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>{u.email}</span>
                        {u.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {u.department}
                          </span>
                        )}
                        <span>{u._count.expenses} expenses</span>
                        {u.spendingLimit && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Limit: {formatCurrency(u.spendingLimit)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Role selector */}
                      <div className="relative">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                          className="h-8 pl-3 pr-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 appearance-none cursor-pointer"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>
                      {/* Department selector */}
                      <div className="relative">
                        <select
                          value={u.department || ""}
                          onChange={(e) => handleUpdateUser(u.id, { department: e.target.value || null })}
                          className="h-8 pl-3 pr-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 appearance-none cursor-pointer"
                        >
                          <option value="">No Dept</option>
                          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>
                      {/* Toggle active */}
                      <button
                        onClick={() => handleUpdateUser(u.id, { isActive: !u.isActive })}
                        className={`p-1 rounded-lg transition-colors ${u.isActive ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-950" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        {u.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Policies Tab */}
      {tab === "policies" && (
        <div className="space-y-3">
          {policies.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16 text-center">
              <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No spending policies</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create policies to enforce spending limits</p>
            </div>
          ) : (
            policies.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{p.name}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>Max: {formatCurrency(p.maxAmount)}</span>
                      {p.category && <span>Category: {p.category}</span>}
                      {p.role && <span>Role: {p.role}</span>}
                      <span>{p.requireApproval ? "Requires approval" : "Auto-approved"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePolicy(p.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === "audit" && (
        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16 text-center">
              <ScrollText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No audit entries</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activity will appear here</p>
            </div>
          ) : (
            auditLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{log.user.firstName} {log.user.lastName}</span>{" "}
                    <span className="text-gray-500 dark:text-gray-400">
                      {log.action.toLowerCase().replace("_", " ")} {log.entity.toLowerCase()}
                    </span>
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {(() => {
                        try {
                          const d = JSON.parse(log.details);
                          return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ");
                        } catch {
                          return log.details;
                        }
                      })()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDate(log.createdAt)}
                </span>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Invite User Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowInvite(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New User</h3>
                <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="First Name *"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className="h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    placeholder="Last Name *"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className="h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email *"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">No Department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <input
                  type="number"
                  placeholder="Spending Limit (optional)"
                  value={inviteForm.spendingLimit}
                  onChange={(e) => setInviteForm({ ...inviteForm, spendingLimit: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleInvite}
                  disabled={saving}
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Policy Modal */}
      <AnimatePresence>
        {showPolicy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowPolicy(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Spending Policy</h3>
                <button onClick={() => setShowPolicy(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  placeholder="Policy Name *"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  placeholder="Max Amount *"
                  value={policyForm.maxAmount}
                  onChange={(e) => setPolicyForm({ ...policyForm, maxAmount: e.target.value })}
                  className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={policyForm.category}
                    onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                    className="h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Categories</option>
                    {["Fuel & Gas", "Equipment", "Travel", "Supplies", "Meals", "Transportation", "Utilities", "Maintenance", "Office", "Other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={policyForm.role}
                    onChange={(e) => setPolicyForm({ ...policyForm, role: e.target.value })}
                    className="h-10 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Roles</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={policyForm.requireApproval}
                    onChange={(e) => setPolicyForm({ ...policyForm, requireApproval: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  Require manager approval
                </label>
                <button
                  onClick={handleCreatePolicy}
                  disabled={saving}
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {saving ? "Creating..." : "Create Policy"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
