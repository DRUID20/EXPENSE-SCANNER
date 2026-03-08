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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ScanResult {
  vendor: string | null;
  title: string | null;
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

  const processFile = useCallback(async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, WebP, or GIF image.");
      setStage("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      setStage("error");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Start scanning
    setStage("scanning");
    setError("");

    const formData = new FormData();
    formData.append("receipt", file);

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
          description: scanResult.notes,
          amount: scanResult.amount || 0,
          currency: scanResult.currency || "USD",
          category: scanResult.category || "Other",
          vendor: scanResult.vendor,
          date: scanResult.date || new Date().toISOString().split("T")[0],
          receiptUrl: imageBase64,
          receiptData: scanResult,
          status: submitStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/dashboard/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  const resetScan = () => {
    setStage("upload");
    setPreview(null);
    setScanResult(null);
    setImageBase64(null);
    setError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan Receipt</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:border-orange-300 transition-colors"
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
            className="space-y-6"
          >
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer min-h-[350px] flex flex-col items-center justify-center text-center ${
                isDragging
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-orange-400 dark:hover:border-orange-600"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />

              <motion.div
                animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/20"
              >
                {isDragging ? (
                  <ImageIcon className="w-10 h-10 text-white" />
                ) : (
                  <Upload className="w-10 h-10 text-white" />
                )}
              </motion.div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {isDragging ? "Drop your receipt here" : "Upload a receipt"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                Drag and drop an image, or click to browse. Supports JPEG, PNG, WebP, and GIF up to 10MB.
              </p>

              <div className="flex items-center gap-4">
                <span className="px-4 py-2 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-sm font-medium">
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

            {/* AI Info */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Powered by Claude AI
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12"
          >
            <div className="flex flex-col items-center text-center">
              {preview && (
                <div className="w-48 h-48 rounded-2xl overflow-hidden mb-8 shadow-lg relative">
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ScanLine className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Scanning your receipt...
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Claude AI is analyzing the image to extract expense details. This usually takes a few seconds.
              </p>

              {/* Progress dots */}
              <div className="flex gap-1.5 mt-6">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
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
            className="space-y-6"
          >
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                Receipt scanned successfully! Review the extracted details below.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Receipt Preview */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sticky top-24">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-500" />
                    Receipt Image
                  </h4>
                  {preview && (
                    <img
                      src={preview}
                      alt="Receipt"
                      className="w-full rounded-xl shadow-sm"
                    />
                  )}
                </div>
              </div>

              {/* Extracted Data */}
              <div className="lg:col-span-2 space-y-4">
                {/* Main info */}
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Extracted Details
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoField
                      icon={<Store className="w-4 h-4" />}
                      label="Vendor"
                      value={scanResult.vendor}
                    />
                    <InfoField
                      icon={<FileText className="w-4 h-4" />}
                      label="Title"
                      value={scanResult.title}
                    />
                    <InfoField
                      icon={<DollarSign className="w-4 h-4" />}
                      label="Amount"
                      value={
                        scanResult.amount != null
                          ? formatCurrency(scanResult.amount, scanResult.currency)
                          : null
                      }
                      highlight
                    />
                    <InfoField
                      icon={<Calendar className="w-4 h-4" />}
                      label="Date"
                      value={scanResult.date}
                    />
                    <InfoField
                      icon={<Tag className="w-4 h-4" />}
                      label="Category"
                      value={scanResult.category}
                    />
                    <InfoField
                      icon={<DollarSign className="w-4 h-4" />}
                      label="Tax"
                      value={
                        scanResult.tax != null
                          ? formatCurrency(scanResult.tax, scanResult.currency)
                          : null
                      }
                    />
                  </div>

                  {scanResult.paymentMethod && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Payment Method: </span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {scanResult.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                {scanResult.lineItems && scanResult.lineItems.length > 0 && (
                  <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Line Items
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Item</th>
                            <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Qty</th>
                            <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Price</th>
                            <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scanResult.lineItems.map((item, i) => (
                            <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                              <td className="py-2.5 text-gray-900 dark:text-white">{item.description}</td>
                              <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                              <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">
                                {formatCurrency(item.unitPrice, scanResult.currency)}
                              </td>
                              <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(item.total, scanResult.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          {scanResult.subtotal != null && (
                            <tr className="border-t border-gray-200 dark:border-gray-700">
                              <td colSpan={3} className="py-2 text-right text-gray-500 font-medium">Subtotal</td>
                              <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(scanResult.subtotal, scanResult.currency)}
                              </td>
                            </tr>
                          )}
                          {scanResult.tax != null && (
                            <tr>
                              <td colSpan={3} className="py-2 text-right text-gray-500 font-medium">Tax</td>
                              <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(scanResult.tax, scanResult.currency)}
                              </td>
                            </tr>
                          )}
                          {scanResult.amount != null && (
                            <tr className="border-t border-gray-200 dark:border-gray-700">
                              <td colSpan={3} className="py-2 text-right text-gray-900 dark:text-white font-bold">Total</td>
                              <td className="py-2 text-right font-bold text-orange-500 text-lg">
                                {formatCurrency(scanResult.amount, scanResult.currency)}
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
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
                    className="flex-1 h-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-orange-300 dark:hover:border-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    Save as Draft
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleCreateExpense("PENDING")}
                    disabled={submitting}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow flex items-center justify-center gap-2 disabled:opacity-60"
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
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Scan Failed
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">{error}</p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetScan}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/dashboard/expenses/new")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 font-medium"
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

function InfoField({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <p
        className={`text-sm font-semibold truncate ${
          highlight
            ? "text-orange-500 text-lg"
            : value
            ? "text-gray-900 dark:text-white"
            : "text-gray-400 italic"
        }`}
      >
        {value || "Not detected"}
      </p>
    </div>
  );
}
