"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Building2,
  ShieldCheck,
  Plus,
  Search,
  ChevronDown,
  Loader2,
  UserPlus,
  UserX,
  UserCheck,
  Edit3,
  Trash2,
  X,
  Eye,
  DollarSign,
  AlertTriangle,
  Network,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

type Tab = "users" | "departments" | "policies";

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: string;
  dept: { id: string; name: string; code: string } | null;
  _count: { expenses: number };
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parentId: string | null;
  managerId: string | null;
  budget: number | null;
  isActive: boolean;
  parent: { id: string; name: string; code: string } | null;
  children: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  _count: { users: number; policies: number };
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  maxAmount: number;
  maxMonthly: number | null;
  categories: string | null;
  roles: string | null;
  departmentId: string | null;
  isActive: boolean;
  department: { id: string; name: string; code: string } | null;
}

const roleBadge: Record<string, string> = {
  ADMIN: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400",
  MANAGER: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
  EMPLOYEE: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

export default function TeamPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modal state
  const [modal, setModal] = useState<{ type: "user" | "department" | "policy"; mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (deptFilter !== "ALL") params.set("departmentId", deptFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }, [search, roleFilter, deptFilter]);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/admin/departments");
    if (res.ok) {
      const data = await res.json();
      setDepartments(data.departments);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    const res = await fetch("/api/admin/policies");
    if (res.ok) {
      const data = await res.json();
      setPolicies(data.policies);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchDepartments(), fetchPolicies()]).finally(() =>
      setLoading(false)
    );
  }, [fetchUsers, fetchDepartments, fetchPolicies]);

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [search, roleFilter, deptFilter, tab, fetchUsers]);

  // User actions
  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) fetchUsers();
  };

  const updateUserRole = async (userId: string, role: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) fetchUsers();
  };

  const assignDepartment = async (userId: string, departmentId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId: departmentId || null }),
    });
    if (res.ok) fetchUsers();
  };

  // Modal submit
  const handleModalSubmit = async (formData: Record<string, unknown>) => {
    setModalLoading(true);
    setModalError("");

    try {
      let url = "";
      let method = "POST";

      if (modal?.type === "user") {
        url = modal.mode === "edit" ? `/api/admin/users/${modal.data?.id}` : "/api/admin/users";
        method = modal.mode === "edit" ? "PATCH" : "POST";
      } else if (modal?.type === "department") {
        url = modal.mode === "edit" ? `/api/admin/departments/${modal.data?.id}` : "/api/admin/departments";
        method = modal.mode === "edit" ? "PATCH" : "POST";
      } else if (modal?.type === "policy") {
        url = modal.mode === "edit" ? `/api/admin/policies/${modal.data?.id}` : "/api/admin/policies";
        method = modal.mode === "edit" ? "PATCH" : "POST";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setModal(null);
      if (modal?.type === "user") fetchUsers();
      if (modal?.type === "department") fetchDepartments();
      if (modal?.type === "policy") fetchPolicies();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setModalLoading(false);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm("Delete this policy?")) return;
    const res = await fetch(`/api/admin/policies/${id}`, { method: "DELETE" });
    if (res.ok) fetchPolicies();
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) fetchDepartments();
    else alert(data.error);
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Admin access required.
      </div>
    );
  }

  const rootDepts = departments.filter((d) => !d.parentId);
  const childDepts = departments.filter((d) => d.parentId);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage users, departments, roles, and spending policies
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-6 w-fit">
        {[
          { id: "users" as Tab, label: "Users", icon: Users, count: users.length },
          { id: "departments" as Tab, label: "Departments", icon: Building2, count: departments.length },
          { id: "policies" as Tab, label: "Policies", icon: ShieldCheck, count: policies.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* USERS TAB */}
          {tab === "users" && (
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="relative">
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 pl-3 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-10 pl-3 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                    <option value="ALL">All Stations</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.code ? `${d.code} - ` : ""}{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModal({ type: "user", mode: "create" })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </motion.button>
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${u.isActive ? "bg-gradient-to-br from-orange-500 to-amber-500" : "bg-gray-400"}`}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm ${u.isActive ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"}`}>
                            {u.firstName} {u.lastName}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge[u.role]}`}>
                            {u.role}
                          </span>
                          {!u.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950 text-red-500">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {u.email}
                          {u.dept && <> &middot; <span className="text-orange-500">{u.dept.name}</span></>}
                          {` · ${u._count.expenses} expenses`}
                        </p>
                      </div>

                      {/* Inline actions */}
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="h-8 pl-2 pr-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        <select
                          value={u.departmentId || ""}
                          onChange={(e) => assignDepartment(u.id, e.target.value)}
                          className="h-8 pl-2 pr-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">No Station</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.code || d.name}</option>
                          ))}
                        </select>

                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleUserActive(u.id, u.isActive)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            u.isActive
                              ? "text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500"
                              : "text-green-400 hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-500"
                          }`}
                          title={u.isActive ? "Deactivate" : "Activate"}
                        >
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">No users found</div>
                )}
              </div>
            </div>
          )}

          {/* DEPARTMENTS TAB */}
          {tab === "departments" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Organization hierarchy with station branches
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModal({ type: "department", mode: "create" })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
                >
                  <Plus className="w-4 h-4" />
                  Add Station
                </motion.button>
              </div>

              <div className="space-y-4">
                {rootDepts.map((dept) => {
                  const children = childDepts.filter((c) => c.parentId === dept.id);
                  return (
                    <div key={dept.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                      {/* Parent */}
                      <div className="p-5 flex items-center gap-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                          <Network className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                            {dept.code && (
                              <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
                                {dept.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {dept.description || "Root organization"}
                            {dept.budget && ` · Budget: ${formatCurrency(dept.budget)}/mo`}
                            {` · ${dept._count.users} members · ${children.length} stations`}
                          </p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setModal({ type: "department", mode: "edit", data: dept as unknown as Record<string, unknown> })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                      </div>

                      {/* Children stations */}
                      {children.length > 0 && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {children.map((child) => (
                            <div key={child.id} className="flex items-center gap-4 px-5 py-3 pl-14">
                              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{child.name}</p>
                                  {child.code && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                      {child.code}
                                    </span>
                                  )}
                                  {!child.isActive && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-500">INACTIVE</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {child.description || "Station branch"}
                                  {child.budget && ` · Budget: ${formatCurrency(child.budget)}/mo`}
                                  {` · ${child._count.users} members`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setModal({ type: "department", mode: "edit", data: child as unknown as Record<string, unknown> })}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </motion.button>
                                {child._count.users === 0 && child._count.policies === 0 && (
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => deleteDepartment(child.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unparented departments */}
                {departments.filter((d) => !d.parentId && !rootDepts.find((r) => r.id === d.id)).length > 0 && (
                  <p className="text-xs text-gray-400 mt-4">Some departments have no parent assigned.</p>
                )}
              </div>
            </div>
          )}

          {/* POLICIES TAB */}
          {tab === "policies" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Spending limits and expense policies
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModal({ type: "policy", mode: "create" })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
                >
                  <Plus className="w-4 h-4" />
                  Add Policy
                </motion.button>
              </div>

              <div className="space-y-3">
                {policies.map((policy) => (
                  <div key={policy.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                        <ShieldCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{policy.name}</h4>
                          {!policy.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-500">INACTIVE</span>
                          )}
                          {policy.department && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                              {policy.department.name}
                            </span>
                          )}
                        </div>
                        {policy.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{policy.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <DollarSign className="w-3 h-3" />
                            Max per expense: <span className="font-semibold text-orange-500">{formatCurrency(policy.maxAmount)}</span>
                          </span>
                          {policy.maxMonthly && (
                            <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <AlertTriangle className="w-3 h-3" />
                              Monthly limit: <span className="font-semibold text-orange-500">{formatCurrency(policy.maxMonthly)}</span>
                            </span>
                          )}
                          {policy.roles && (
                            <span className="text-xs text-gray-500">
                              Roles: {JSON.parse(policy.roles).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setModal({ type: "policy", mode: "edit", data: policy as unknown as Record<string, unknown> })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deletePolicy(policy.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
                {policies.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">No policies configured</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <ModalForm
            modal={modal}
            departments={departments}
            error={modalError}
            loading={modalLoading}
            onSubmit={handleModalSubmit}
            onClose={() => { setModal(null); setModalError(""); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ModalForm({
  modal,
  departments,
  error,
  loading,
  onSubmit,
  onClose,
}: {
  modal: { type: string; mode: string; data?: Record<string, unknown> };
  departments: Department[];
  error: string;
  loading: boolean;
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (modal.mode === "edit" && modal.data) {
      const d = modal.data;
      return Object.fromEntries(
        Object.entries(d).filter(([, v]) => typeof v === "string" || typeof v === "number").map(([k, v]) => [k, String(v ?? "")])
      );
    }
    return {};
  });

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const titles: Record<string, string> = {
    user: modal.mode === "create" ? "Add New User" : "Edit User",
    department: modal.mode === "create" ? "Add Station/Department" : "Edit Department",
    policy: modal.mode === "create" ? "Add Spending Policy" : "Edit Policy",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{titles[modal.type]}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {modal.type === "user" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="First Name *" value={form.firstName || ""} onChange={(v) => update("firstName", v)} />
                <InputField label="Last Name *" value={form.lastName || ""} onChange={(v) => update("lastName", v)} />
              </div>
              <InputField label="Email *" value={form.email || ""} onChange={(v) => update("email", v)} type="email" />
              {modal.mode === "create" && (
                <InputField label="Password *" value={form.password || ""} onChange={(v) => update("password", v)} type="password" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Role</label>
                  <select value={form.role || "EMPLOYEE"} onChange={(e) => update("role", e.target.value)} className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Station</label>
                  <select value={form.departmentId || ""} onChange={(e) => update("departmentId", e.target.value)} className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.code ? `${d.code} - ` : ""}{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {modal.type === "department" && (
            <>
              <InputField label="Name *" value={form.name || ""} onChange={(v) => update("name", v)} placeholder="e.g., Station Foxtrot" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Code" value={form.code || ""} onChange={(v) => update("code", v)} placeholder="e.g., STN-F" />
                <InputField label="Monthly Budget" value={form.budget || ""} onChange={(v) => update("budget", v)} type="number" placeholder="50000" />
              </div>
              <InputField label="Description" value={form.description || ""} onChange={(v) => update("description", v)} placeholder="Brief description..." />
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Parent Organization</label>
                <select value={form.parentId || ""} onChange={(e) => update("parentId", e.target.value)} className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                  <option value="">None (Root)</option>
                  {departments.filter((d) => d.id !== (modal.data?.id as string)).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {modal.type === "policy" && (
            <>
              <InputField label="Policy Name *" value={form.name || ""} onChange={(v) => update("name", v)} placeholder="e.g., Station Expense Limit" />
              <InputField label="Description" value={form.description || ""} onChange={(v) => update("description", v)} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Max Per Expense *" value={form.maxAmount || ""} onChange={(v) => update("maxAmount", v)} type="number" placeholder="5000" />
                <InputField label="Monthly Limit" value={form.maxMonthly || ""} onChange={(v) => update("maxMonthly", v)} type="number" placeholder="20000" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Applies to Station</label>
                <select value={form.departmentId || ""} onChange={(e) => update("departmentId", e.target.value)} className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                  <option value="">All (Global)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.code ? `${d.code} - ` : ""}{d.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onSubmit(form)}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : modal.mode === "create" ? "Create" : "Save Changes"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-6 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium text-sm"
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
