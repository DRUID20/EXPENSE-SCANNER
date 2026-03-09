"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

export default function NewExpensePage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPEG, PNG, WebP)");
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

  const handleSubmit = async (status: "DRAFT" | "PENDING") => {
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
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status,
          ...(receiptBase64 && { receiptUrl: receiptBase64 }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(status === "DRAFT" ? "Expense saved as draft" : "Expense submitted for approval");
      router.push("/dashboard/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/expenses">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </Link>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">New Expense</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Enter expense details manually
          </p>
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
        {/* Title */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            placeholder="e.g., Office supplies from Staples"
            className="w-full h-11 px-4 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Amount + Currency + Date Row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              Amount <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => updateForm("amount", e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-4 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => updateForm("currency", e.target.value)}
              className="w-full h-11 px-4 rounded-xl input-premium text-gray-900 dark:text-white text-sm transition-all appearance-none"
            >
              <option value="UGX">UGX</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="KES">KES</option>
              <option value="TZS">TZS</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateForm("date", e.target.value)}
              className="w-full h-11 px-4 rounded-xl input-premium text-gray-900 dark:text-white text-sm transition-all"
            />
          </div>
        </div>

        {/* Category + Vendor */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 text-gray-400" />
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
              className="w-full h-11 px-4 rounded-xl input-premium text-gray-900 dark:text-white text-sm transition-all appearance-none"
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Store className="w-4 h-4 text-gray-400" />
              Vendor
            </label>
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => updateForm("vendor", e.target.value)}
              placeholder="e.g., Staples, Shell, etc."
              className="w-full h-11 px-4 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Image className="w-4 h-4 text-gray-400" />
            Receipt
          </label>
          {receiptPreview ? (
            <div className="relative inline-block">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="max-h-48 rounded-xl border border-black/[0.08] dark:border-white/[0.08] object-contain"
              />
              <button
                onClick={removeReceipt}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 rounded-xl border-2 border-dashed border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-500"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">Click to attach receipt</span>
              <span className="text-xs">JPEG, PNG, WebP up to 10MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleReceiptChange}
            className="hidden"
          />
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <StickyNote className="w-4 h-4 text-gray-400" />
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            placeholder="Brief description of the expense..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => updateForm("notes", e.target.value)}
            placeholder="Additional notes for the approver..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl input-premium text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSubmit("DRAFT")}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            Save as Draft
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSubmit("PENDING")}
            disabled={submitting}
            className="flex-1 h-11 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Submit for Approval
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
