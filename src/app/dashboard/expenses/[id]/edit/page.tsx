"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Calendar,
  Tag,
  Store,
  FileText,
  Loader2,
  StickyNote,
  Upload,
  Image,
  X,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";

const CATEGORIES = [
  "Fuel & Gas",
  "Equipment",
  "Travel",
  "Supplies",
  "Meals",
  "Transportation",
  "Utilities",
  "Maintenance",
  "Office",
  "Other",
];

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "UGX",
    category: "",
    vendor: "",
    date: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchExpense() {
      try {
        const res = await fetch(`/api/expenses/${params.id}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error("Expense not found");
          router.push("/dashboard/expenses");
          return;
        }
        const e = data.expense;
        if (e.status !== "DRAFT") {
          toast.error("Only draft expenses can be edited");
          router.push(`/dashboard/expenses/${params.id}`);
          return;
        }
        setForm({
          title: e.title || "",
          description: e.description || "",
          amount: String(e.amount || ""),
          currency: e.currency || "UGX",
          category: e.category || "",
          vendor: e.vendor || "",
          date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
          notes: e.notes || "",
        });
        if (e.receiptPath || e.receiptUrl) {
          setReceiptPreview(e.receiptPath || e.receiptUrl);
        }
      } catch {
        toast.error("Failed to load expense");
        router.push("/dashboard/expenses");
      } finally {
        setLoading(false);
      }
    }
    fetchExpense();
  }, [params.id, router, toast]);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReceiptPreview(base64);
      setReceiptBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptPreview(null);
    setReceiptBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (status: "DRAFT" | "PENDING") => {
    setError("");
    if (!form.title || !form.amount || !form.category || !form.date) {
      setError("Please fill in title, amount, category, and date.");
      return;
    }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          status,
          ...(receiptBase64 && { receiptUrl: receiptBase64 }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(status === "DRAFT" ? "Expense updated" : "Expense submitted for approval");
      router.push(`/dashboard/expenses/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/expenses/${params.id}`}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </Link>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--foreground)] tracking-tight">Edit Expense</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Update draft expense details</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="premium-card p-4 lg:p-6 space-y-4 lg:space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
            <FileText className="w-4 h-4 text-gray-400" /> Title <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="e.g., Office supplies" className="w-full h-11 px-4 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" /> Amount <span className="text-red-400">*</span>
            </label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => updateForm("amount", e.target.value)} placeholder="0.00" className="w-full h-11 px-4 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">Currency</label>
            <select value={form.currency} onChange={(e) => updateForm("currency", e.target.value)} className="w-full h-11 px-4 rounded-xl input-premium text-[var(--foreground)] text-sm appearance-none">
              <option value="UGX">UGX</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="KES">KES</option>
              <option value="TZS">TZS</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
              <Calendar className="w-4 h-4 text-gray-400" /> Date <span className="text-red-400">*</span>
            </label>
            <input type="date" value={form.date} onChange={(e) => updateForm("date", e.target.value)} className="w-full h-11 px-4 rounded-xl input-premium text-[var(--foreground)] text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
              <Tag className="w-4 h-4 text-gray-400" /> Category <span className="text-red-400">*</span>
            </label>
            <select value={form.category} onChange={(e) => updateForm("category", e.target.value)} className="w-full h-11 px-4 rounded-xl input-premium text-[var(--foreground)] text-sm appearance-none">
              <option value="">Select category...</option>
              {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
              <Store className="w-4 h-4 text-gray-400" /> Vendor
            </label>
            <input type="text" value={form.vendor} onChange={(e) => updateForm("vendor", e.target.value)} placeholder="e.g., Shell, Staples" className="w-full h-11 px-4 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
            <Image className="w-4 h-4 text-gray-400" /> Receipt
          </label>
          {receiptPreview ? (
            <div className="relative inline-block">
              <img src={receiptPreview} alt="Receipt" className="max-h-48 rounded-xl border border-black/[0.08] dark:border-white/[0.08] object-contain" />
              <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-500">
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">Click to attach receipt</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReceiptChange} className="hidden" />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">
            <StickyNote className="w-4 h-4 text-gray-400" /> Description
          </label>
          <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Brief description..." rows={3} className="w-full px-4 py-3 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400 resize-none" />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] mb-2">Notes</label>
          <textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Additional notes..." rows={2} className="w-full px-4 py-3 rounded-xl input-premium text-[var(--foreground)] placeholder-gray-400 resize-none" />
        </div>

        <div className="flex gap-3 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
          <motion.button whileTap={{ scale: 0.99 }} onClick={() => handleSave("DRAFT")} disabled={submitting} className="flex-1 h-11 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-[var(--muted)] font-medium text-sm hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            Save Draft
          </motion.button>
          <motion.button whileTap={{ scale: 0.99 }} onClick={() => handleSave("PENDING")} disabled={submitting} className="flex-1 h-11 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-60">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Save &amp; Submit</span><ArrowRight className="w-4 h-4" /></>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
