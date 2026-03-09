"use client";

import { motion } from "framer-motion";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Flame/Energy Icon */}
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C12 2 4 8 4 14C4 18.4183 7.58172 22 12 22C16.4183 22 20 18.4183 20 14C20 8 12 2 12 2Z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M12 8C12 8 8 12 8 15C8 17.2091 9.79086 19 12 19C14.2091 19 16 17.2091 16 15C16 12 12 8 12 8Z"
              fill="url(#flame-gradient)"
            />
            <defs>
              <linearGradient
                id="flame-gradient"
                x1="12"
                y1="8"
                x2="12"
                y2="19"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#F97316" />
                <stop offset="1" stopColor="#DC2626" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white dark:border-[#111318]" />
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
            GASCO
          </h1>
          <p className="text-[10px] font-medium text-gray-400 tracking-[0.15em] uppercase -mt-0.5">
            Expenses
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
