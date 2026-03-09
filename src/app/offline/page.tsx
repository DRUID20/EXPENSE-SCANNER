"use client";

import { WifiOff, RefreshCw, Camera } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/20">
          <WifiOff className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection. Some features
          are still available offline.
        </p>

        <div className="space-y-3 mb-8">
          <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Camera className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  Capture Receipts
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Take photos and save them. They&apos;ll sync when you&apos;re
                  back online.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  View Cached Data
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Previously loaded pages and data are available.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link href="/dashboard">
            <button className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
