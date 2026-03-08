"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      <motion.div
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center"
        animate={{ left: isDark ? "calc(100% - 26px)" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-orange-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-orange-500" />
        )}
      </motion.div>
    </motion.button>
  );
}
