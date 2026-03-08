"use client";

import { motion } from "framer-motion";
import { ScanLine, Camera, Upload } from "lucide-react";

export default function ScanPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Scan Receipt
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Upload or capture a receipt and let AI extract the details
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ y: -4 }}
          className="p-8 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Take a Photo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use your camera to capture a receipt in real-time
          </p>
          <span className="mt-4 px-4 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-xs font-semibold">
            Coming in Phase 2
          </span>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="p-8 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Upload Image
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload a receipt image from your device
          </p>
          <span className="mt-4 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            Coming in Phase 2
          </span>
        </motion.div>
      </div>

      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-4">
          <ScanLine className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              AI-Powered Scanning
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              In Phase 2, Claude AI will automatically extract vendor name, amount, date, tax, line items, and category from your receipts and invoices. Just snap a photo and we handle the rest.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
