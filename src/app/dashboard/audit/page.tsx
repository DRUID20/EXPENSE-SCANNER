"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  LogIn,
  UserCog,
  Building2,
  Users,
  FileText,
  Download,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  userId: string;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CREATE: { icon: Plus, color: "text-green-500 bg-green-100 dark:bg-green-950", label: "Created" },
  UPDATE: { icon: Edit3, color: "text-blue-500 bg-blue-100 dark:bg-blue-950", label: "Updated" },
  DELETE: { icon: Trash2, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Deleted" },
  APPROVE: { icon: CheckCircle2, color: "text-green-500 bg-green-100 dark:bg-green-950", label: "Approved" },
  REJECT: { icon: XCircle, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Rejected" },
  LOGIN: { icon: LogIn, color: "text-blue-500 bg-blue-100 dark:bg-blue-950", label: "Logged in" },
  LOGOUT: { icon: LogIn, color: "text-gray-500 bg-gray-100 dark:bg-gray-800", label: "Logged out" },
  ROLE_CHANGE: { icon: UserCog, color: "text-purple-500 bg-purple-100 dark:bg-purple-950", label: "Role changed" },
  DEACTIVATE: { icon: XCircle, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Deactivated" },
  ACTIVATE: { icon: CheckCircle2, color: "text-green-500 bg-green-100 dark:bg-green-950", label: "Activated" },
  ASSIGN_DEPARTMENT: { icon: Building2, color: "text-blue-500 bg-blue-100 dark:bg-blue-950", label: "Assigned dept" },
  POLICY_CREATE: { icon: Plus, color: "text-purple-500 bg-purple-100 dark:bg-purple-950", label: "Policy created" },
  POLICY_UPDATE: { icon: Edit3, color: "text-purple-500 bg-purple-100 dark:bg-purple-950", label: "Policy updated" },
  POLICY_DELETE: { icon: Trash2, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Policy deleted" },
  DEPT_CREATE: { icon: Plus, color: "text-blue-500 bg-blue-100 dark:bg-blue-950", label: "Dept created" },
  DEPT_UPDATE: { icon: Edit3, color: "text-blue-500 bg-blue-100 dark:bg-blue-950", label: "Dept updated" },
  DEPT_DELETE: { icon: Trash2, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Dept deleted" },
  BULK_APPROVE: { icon: CheckCircle2, color: "text-green-500 bg-green-100 dark:bg-green-950", label: "Bulk approved" },
  BULK_REJECT: { icon: XCircle, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Bulk rejected" },
  BULK_DELETE: { icon: Trash2, color: "text-red-500 bg-red-100 dark:bg-red-950", label: "Bulk deleted" },
  EXPORT: { icon: Download, color: "text-gray-500 bg-gray-100 dark:bg-gray-800", label: "Exported" },
};

const defaultAction = { icon: FileText, color: "text-gray-500 bg-gray-100 dark:bg-gray-800", label: "Action" };

const entityIcons: Record<string, React.ElementType> = {
  EXPENSE: FileText,
  USER: Users,
  DEPARTMENT: Building2,
  POLICY: Shield,
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (entityFilter !== "ALL") params.set("entityType", entityFilter);
      params.set("page", String(page));
      params.set("limit", "30");

      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter]);

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Admin access required.
      </div>
    );
  }

  const formatDetails = (details: string | null): string => {
    if (!details) return "";
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([key, val]) => {
          if (typeof val === "object" && val !== null && "from" in (val as Record<string, unknown>) && "to" in (val as Record<string, unknown>)) {
            const v = val as { from: unknown; to: unknown };
            return `${key}: ${v.from} → ${v.to}`;
          }
          return `${key}: ${val}`;
        })
        .join(", ");
    } catch {
      return details;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track all system actions and changes ({total} entries)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="h-10 pl-3 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
            <option value="ALL">All Actions</option>
            {Object.keys(actionConfig).map((a) => (
              <option key={a} value={a}>{actionConfig[a].label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="h-10 pl-3 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
            <option value="ALL">All Entities</option>
            <option value="EXPENSE">Expenses</option>
            <option value="USER">Users</option>
            <option value="DEPARTMENT">Departments</option>
            <option value="POLICY">Policies</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16 text-center">
          <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No audit entries</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Actions will appear here as they happen.</p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="space-y-1">
            {logs.map((log, i) => {
              const config = actionConfig[log.action] || defaultAction;
              const Icon = config.icon;
              const EntityIcon = entityIcons[log.entityType] || FileText;
              const details = formatDetails(log.details);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {log.user.firstName} {log.user.lastName}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{config.label}</span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        <EntityIcon className="w-3 h-3" />
                        {log.entityType}
                      </span>
                    </div>
                    {details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xl">{details}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">{log.user.email}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-orange-500 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3">{page}</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-orange-500 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
