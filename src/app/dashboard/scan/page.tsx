"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImageIcon,
  ArrowRight,
  RotateCcw,
  Sparkles,
  DollarSign,
  Calendar,
  Tag,
  Store,
  FileText,
  Receipt,
  Pencil,
  Files,
  Trash2,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  "Fuel & Gas",
  "Equipment",
  "Office Supplies",
  "Meals",
  "Transport & Accommodation",
  "Utilities",
  "Repair & Maintenance",
  "Vehicle Repairs & Maintenance",
  "Generator Expenses",
  "Other",
];

function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // Skip if already small enough (under 500KB)
    if (file.size <= 500 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

interface ScanResult {
  vendor: string | null;
  title: string | null;
  description: string | null;
  amount: number | null;
  currency: string;
  date: string | null;
  category: string | null;
  tax: number | null;
  subtotal: number | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> | null;
  paymentMethod: string | null;
  receiptNumber: string | null;
  notes: string | null;
}

type ScanStage = "upload" | "scanning" | "result" | "error";

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<ScanStage>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<Array<{
    file: File;
    status: 'pending' | 'scanning' | 'done' | 'error';
    result?: ScanResult;
    imageBase64?: string | null;
    error?: string;
  }>>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, WebP, GIF, or PDF file.");
      setStage("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      setStage("error");
      return;
    }

    const isPdf = file.type === "application/pdf";

    // Show preview (no preview for PDFs)
    if (!isPdf) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Start scanning
    setStage("scanning");
    setError("");

    // Compress images before upload; PDFs are sent as-is
    const toUpload = isPdf ? file : await compressImage(file);

    const formData = new FormData();
    formData.append("receipt", toUpload);

    try {
      const res = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      }

      setScanResult(data.data);
      setImageBase64(data.imageBase64);
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan receipt");
      setStage("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleCreateExpense = async (submitStatus: "DRAFT" | "PENDING") => {
    if (!scanResult) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: scanResult.title || "Scanned Expense",
          description: scanResult.description || scanResult.notes || "",
          amount: scanResult.amount || 0,
          currency: scanResult.currency || "UGX",
          category: scanResult.category || "Other",
          vendor: scanResult.vendor,
          date: scanResult.date || new Date().toISOString().split("T")[0],
          notes: scanResult.notes,
          receiptUrl: imageBase64,
          receiptData: scanResult,
          status: submitStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Show duplicate warning if detected but still created
      if (data.duplicateWarning) {
        alert(`Note: ${data.duplicateWarning.message}\nThe expense was still created.`);
      }

      router.push("/dashboard/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 10);
    setBatchFiles(fileArray);
    setBatchResults(fileArray.map(f => ({ file: f, status: 'pending' as const })));
  };

  const processBatch = async () => {
    setBatchProcessing(true);
    const results = [...batchResults];

    for (let i = 0; i < results.length; i++) {
      results[i] = { ...results[i], status: 'scanning' };
      setBatchResults([...results]);

      try {
        const file = results[i].file;
        const isPdf = file.type === 'application/pdf';
        const toUpload = isPdf ? file : await compressImage(file);
        const formData = new FormData();
        formData.append('receipt', toUpload);

        const res = await fetch('/api/scan', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Scan failed');

        results[i] = {
          ...results[i],
          status: 'done',
          result: data.data,
          imageBase64: data.imageBase64,
        };
      } catch (err) {
        results[i] = {
          ...results[i],
          status: 'error',
          error: err instanceof Error ? err.message : 'Scan failed',
        };
      }
      setBatchResults([...results]);
    }
    setBatchProcessing(false);
  };

  const handleCreateAllDrafts = async (submitStatus: "DRAFT" | "PENDING" = "DRAFT") => {
    setBatchSubmitting(true);
    try {
      const successResults = batchResults.filter(r => r.status === 'done' && r.result);
      for (const item of successResults) {
        const sr = item.result!;
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sr.title || 'Scanned Expense',
            description: sr.description || sr.notes || '',
            amount: sr.amount || 0,
            currency: sr.currency || 'UGX',
            category: sr.category || 'Other',
            vendor: sr.vendor,
            date: sr.date || new Date().toISOString().split('T')[0],
            notes: sr.notes,
            receiptUrl: item.imageBase64,
            receiptData: sr,
            status: submitStatus,
          }),
        });
      }
      router.push('/dashboard/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expenses');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const resetScan = () => {
    setStage("upload");
    setPreview(null);
    setScanResult(null);
    setImageBase64(null);
    setError("");
    setBatchMode(false);
    setBatchFiles([]);
    setBatchResults([]);
    setBatchProcessing(false);
    setBatchSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl tracking-tight font-bold text-[var(--foreground)]">Scan Receipt</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Upload or capture a receipt and let Claude AI extract the details
          </p>
        </div>
        {stage !== "upload" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetScan}
            className="flex items-center gap-2 px-4 py-2 rounded-xl premium-card text-sm text-[var(--muted)] hover:border-emerald-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Scan
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* UPLOAD STAGE */}
        {stage === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 lg:space-y-6"
          >
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] w-fit">
              <button
                onClick={() => { setBatchMode(false); setBatchFiles([]); setBatchResults([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!batchMode ? 'bg-white dark:bg-white/10 shadow-sm text-[var(--foreground)]' : 'text-[var(--muted)]'}`}
              >
                Single
              </button>
              <button
                onClick={() => { setBatchMode(true); resetScan(); setBatchMode(true); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${batchMode ? 'bg-white dark:bg-white/10 shadow-sm text-[var(--foreground)]' : 'text-[var(--muted)]'}`}
              >
                <Files className="w-3.5 h-3.5" />
                Batch Scan
              </button>
            </div>

            {!batchMode ? (
              <>
                {/* Single Mode Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative p-6 lg:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer min-h-[250px] lg:min-h-[350px] flex flex-col items-center justify-center text-center ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-black/[0.06] dark:border-white/[0.06] bg-[var(--card-bg)] hover:border-emerald-400 dark:hover:border-emerald-600"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <motion.div
                    animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 shadow-sm"
                  >
                    {isDragging ? (
                      <ImageIcon className="w-10 h-10 text-white" />
                    ) : (
                      <Upload className="w-10 h-10 text-white" />
                    )}
                  </motion.div>

                  <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight mb-2">
                    {isDragging ? "Drop your receipt here" : "Upload a receipt"}
                  </h3>
                  <p className="text-[var(--muted)] mb-6 max-w-md">
                    Drag and drop an image or PDF, or click to browse. Supports JPEG, PNG, WebP, GIF, and PDF up to 10MB.
                  </p>

                  <div className="flex items-center gap-4">
                    <span className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                      Browse Files
                    </span>
                    <span className="text-gray-400 text-sm">or</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-sm font-medium"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Batch Mode UI */}
                <input
                  ref={batchFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  multiple
                  onChange={(e) => { if (e.target.files) handleBatchFiles(e.target.files); }}
                  className="hidden"
                />

                {batchFiles.length === 0 ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files.length > 0) handleBatchFiles(e.dataTransfer.files);
                    }}
                    onClick={() => batchFileInputRef.current?.click()}
                    className={`relative p-6 lg:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer min-h-[250px] lg:min-h-[350px] flex flex-col items-center justify-center text-center ${
                      isDragging
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                        : "border-black/[0.06] dark:border-white/[0.06] bg-[var(--card-bg)] hover:border-emerald-400 dark:hover:border-emerald-600"
                    }`}
                  >
                    <motion.div
                      animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 shadow-sm"
                    >
                      <Files className="w-10 h-10 text-white" />
                    </motion.div>

                    <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight mb-2">
                      {isDragging ? "Drop your receipts here" : "Upload multiple receipts"}
                    </h3>
                    <p className="text-[var(--muted)] mb-6 max-w-md">
                      Select up to 10 receipt images or PDFs at once. They will be scanned sequentially.
                    </p>

                    <span className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                      Browse Files
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File list */}
                    <div className="premium-card p-4 lg:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                          <Files className="w-4 h-4 text-emerald-500" />
                          {batchFiles.length} receipt{batchFiles.length !== 1 ? 's' : ''} queued
                        </h4>
                        {!batchProcessing && batchResults.every(r => r.status === 'pending') && (
                          <button
                            onClick={() => { setBatchFiles([]); setBatchResults([]); }}
                            className="text-sm text-[var(--muted)] hover:text-red-500 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {batchResults.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              item.status === 'scanning'
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                                : item.status === 'done'
                                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                                : item.status === 'error'
                                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                                : 'border-black/[0.06] dark:border-white/[0.06]'
                            }`}
                          >
                            {/* Status icon */}
                            <div className="flex-shrink-0">
                              {item.status === 'pending' && (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              {item.status === 'scanning' && (
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                </div>
                              )}
                              {item.status === 'done' && (
                                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </div>
                              )}
                              {item.status === 'error' && (
                                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                </div>
                              )}
                            </div>

                            {/* File info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                {item.file.name}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {item.status === 'pending' && 'Waiting...'}
                                {item.status === 'scanning' && 'Scanning...'}
                                {item.status === 'done' && item.result && (
                                  <>
                                    {item.result.vendor || 'Unknown vendor'}
                                    {item.result.amount != null && ` — ${formatCurrency(item.result.amount, item.result.currency || 'UGX')}`}
                                  </>
                                )}
                                {item.status === 'error' && (
                                  <span className="text-red-500">{item.error}</span>
                                )}
                              </p>
                            </div>

                            {/* File size */}
                            <span className="text-xs text-[var(--muted)] flex-shrink-0">
                              {(item.file.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Batch action buttons */}
                    {!batchProcessing && batchResults.every(r => r.status === 'pending') && (
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => { setBatchFiles([]); setBatchResults([]); }}
                          className="px-6 h-12 rounded-xl premium-card text-[var(--muted)] font-semibold text-sm hover:border-red-300 dark:hover:border-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={processBatch}
                          className="flex-1 h-12 rounded-xl btn-primary text-sm flex items-center justify-center gap-2"
                        >
                          <ScanLine className="w-4 h-4" />
                          Start Scanning ({batchFiles.length} receipt{batchFiles.length !== 1 ? 's' : ''})
                        </motion.button>
                      </div>
                    )}

                    {batchProcessing && (
                      <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                          Scanning {batchResults.filter(r => r.status === 'done' || r.status === 'error').length + 1} of {batchResults.length}...
                        </p>
                      </div>
                    )}

                    {!batchProcessing && batchResults.some(r => r.status === 'done' || r.status === 'error') && (
                      <div className="space-y-3">
                        {/* Results summary */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                            Batch scan complete: {batchResults.filter(r => r.status === 'done').length} succeeded, {batchResults.filter(r => r.status === 'error').length} failed
                          </p>
                        </div>

                        {batchResults.filter(r => r.status === 'done').length > 0 && (
                          <div className="flex gap-3">
                            <motion.button
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleCreateAllDrafts("DRAFT")}
                              disabled={batchSubmitting}
                              className="flex-1 h-12 rounded-xl premium-card text-[var(--muted)] font-semibold text-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                              {batchSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create All as Drafts'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleCreateAllDrafts("PENDING")}
                              disabled={batchSubmitting}
                              className="flex-1 h-12 rounded-xl btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                              {batchSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  Create All &amp; Submit
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </motion.button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* AI Info */}
            <div className="p-5 premium-card border-emerald-200/50 dark:border-emerald-500/10 bg-emerald-50/30 dark:bg-emerald-950/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--foreground)] mb-1">
                    Powered by Claude AI
                  </h4>
                  <p className="text-sm text-[var(--muted)]">
                    Our AI automatically extracts vendor, amount, date, tax, line items, and category from your receipts. Review the extracted data and submit with one click.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SCANNING STAGE */}
        {stage === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="premium-card p-8 lg:p-12"
          >
            <div className="flex flex-col items-center text-center">
              {preview && (
                <div className="w-48 h-48 rounded-2xl overflow-hidden mb-8 shadow-sm relative">
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ScanLine className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight mb-2">
                Scanning your receipt...
              </h3>
              <p className="text-[var(--muted)] max-w-md">
                Claude AI is analyzing the image to extract expense details. This usually takes a few seconds.
              </p>

              {/* Progress dots */}
              <div className="flex gap-1.5 mt-6">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
              </div>
            </div>
          </motion.div>
        )}

        {/* RESULT STAGE */}
        {stage === "result" && scanResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 lg:space-y-6"
          >
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                Receipt scanned successfully! Review and edit the details below before saving.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Receipt Preview */}
              <div className="lg:col-span-1">
                <div className="premium-card p-4 sticky top-24">
                  <h4 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-500" />
                    Receipt Image
                  </h4>
                  {preview ? (
                    <img
                      src={preview}
                      alt="Receipt"
                      className="w-full rounded-xl shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-48 rounded-xl bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center gap-2">
                      <FileText className="w-10 h-10 text-gray-400" />
                      <span className="text-sm text-[var(--muted)]">PDF Receipt</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted Data — Editable */}
              <div className="lg:col-span-2 space-y-4">
                {/* Main info */}
                <div className="premium-card p-4 lg:p-6">
                  <h4 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-emerald-500" />
                    Review &amp; Edit Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                        <Store className="w-3.5 h-3.5" /> Vendor
                      </label>
                      <input
                        type="text"
                        value={scanResult.vendor || ""}
                        onChange={(e) => setScanResult({ ...scanResult, vendor: e.target.value || null })}
                        placeholder="Vendor name"
                        className="w-full h-10 px-3 rounded-xl input-premium text-sm text-[var(--foreground)] placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                        <FileText className="w-3.5 h-3.5" /> Title
                      </label>
                      <input
                        type="text"
                        value={scanResult.title || ""}
                        onChange={(e) => setScanResult({ ...scanResult, title: e.target.value || null })}
                        placeholder="Expense title"
                        className="w-full h-10 px-3 rounded-xl input-premium text-sm text-[var(--foreground)] placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Amount <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scanResult.amount ?? ""}
                        onChange={(e) => setScanResult({ ...scanResult, amount: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="0.00"
                        className="w-full h-10 px-3 rounded-xl input-premium text-sm text-[var(--foreground)] placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date
                      </label>
                      <input
                        type="date"
                        value={scanResult.date || ""}
                        onChange={(e) => setScanResult({ ...scanResult, date: e.target.value || null })}
                        className="w-full h-10 px-3 rounded-xl input-premium text-sm text-[var(--foreground)]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                        <Tag className="w-3.5 h-3.5" /> Category
                      </label>
                      <select
                        value={scanResult.category || ""}
                        onChange={(e) => setScanResult({ ...scanResult, category: e.target.value || null })}
                        className="w-full h-10 px-3 rounded-xl input-premium text-sm text-[var(--foreground)] appearance-none"
                      >
                        <option value="">Select category...</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                        Currency
                      </label>
                      <select
                        value={scanResult.currency || "UGX"}
                        onChange={(e) => setScanResult({ ...scanResult, currency: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl input-premium text-sm text-[var(--foreground)] appearance-none"
                      >
                        <option value="UGX">UGX</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="KES">KES</option>
                        <option value="TZS">TZS</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-4">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                      <FileText className="w-3.5 h-3.5" /> Description
                    </label>
                    <textarea
                      value={scanResult.description || ""}
                      onChange={(e) => setScanResult({ ...scanResult, description: e.target.value || null })}
                      placeholder="Expense description..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl input-premium text-sm text-[var(--foreground)] placeholder-gray-400 resize-none"
                    />
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] mb-1.5">
                      Notes
                    </label>
                    <textarea
                      value={scanResult.notes || ""}
                      onChange={(e) => setScanResult({ ...scanResult, notes: e.target.value || null })}
                      placeholder="Additional notes..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl input-premium text-sm text-[var(--foreground)] placeholder-gray-400 resize-none"
                    />
                  </div>
                </div>

                {/* Line Items — Editable */}
                {scanResult.lineItems && scanResult.lineItems.length > 0 && (
                  <div className="premium-card p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[var(--foreground)]">
                        Line Items
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const items = [...(scanResult.lineItems || []), { description: "", quantity: 1, unitPrice: 0, total: 0 }];
                          setScanResult({ ...scanResult, lineItems: items });
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {scanResult.lineItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div className="sm:col-span-2">
                              <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Item</label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const items = [...scanResult.lineItems!];
                                  items[i] = { ...items[i], description: e.target.value };
                                  setScanResult({ ...scanResult, lineItems: items });
                                }}
                                className="w-full h-8 px-2 rounded-lg input-premium text-sm text-[var(--foreground)]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Qty</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const items = [...scanResult.lineItems!];
                                  const qty = parseFloat(e.target.value) || 0;
                                  items[i] = { ...items[i], quantity: qty, total: qty * items[i].unitPrice };
                                  setScanResult({ ...scanResult, lineItems: items });
                                }}
                                className="w-full h-8 px-2 rounded-lg input-premium text-sm text-[var(--foreground)] text-right"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Unit Price</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const items = [...scanResult.lineItems!];
                                  const price = parseFloat(e.target.value) || 0;
                                  items[i] = { ...items[i], unitPrice: price, total: items[i].quantity * price };
                                  setScanResult({ ...scanResult, lineItems: items });
                                }}
                                className="w-full h-8 px-2 rounded-lg input-premium text-sm text-[var(--foreground)] text-right"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 pt-4">
                            <span className="text-xs font-medium text-[var(--foreground)]">
                              {formatCurrency(item.total, scanResult.currency)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const items = scanResult.lineItems!.filter((_, idx) => idx !== i);
                                setScanResult({ ...scanResult, lineItems: items.length > 0 ? items : null });
                              }}
                              className="text-red-400 hover:text-red-500 transition-colors p-0.5"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Subtotal, Tax, Total — Editable */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--muted)] font-medium">Subtotal</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={scanResult.subtotal ?? ""}
                          onChange={(e) => setScanResult({ ...scanResult, subtotal: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="0.00"
                          className="w-32 h-8 px-2 rounded-lg input-premium text-sm text-[var(--foreground)] text-right"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--muted)] font-medium">Tax</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={scanResult.tax ?? ""}
                          onChange={(e) => setScanResult({ ...scanResult, tax: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="0.00"
                          className="w-32 h-8 px-2 rounded-lg input-premium text-sm text-[var(--foreground)] text-right"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-[var(--foreground)] font-bold">Total</span>
                        <span className="font-bold text-emerald-500 text-lg">
                          {formatCurrency(scanResult.amount ?? 0, scanResult.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleCreateExpense("DRAFT")}
                    disabled={submitting}
                    className="flex-1 h-12 rounded-xl premium-card text-[var(--muted)] font-semibold text-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    Save as Draft
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleCreateExpense("PENDING")}
                    disabled={submitting}
                    className="flex-1 h-12 rounded-xl btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
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
            </div>
          </motion.div>
        )}

        {/* ERROR STAGE */}
        {stage === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="premium-card p-8 lg:p-12"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight mb-2">
                Scan Failed
              </h3>
              <p className="text-[var(--muted)] mb-6 max-w-md">{error}</p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetScan}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl btn-primary text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/dashboard/expenses/new")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl premium-card text-sm text-[var(--muted)] font-medium"
                >
                  Enter Manually
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

