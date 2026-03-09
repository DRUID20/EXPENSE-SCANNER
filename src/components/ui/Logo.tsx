"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Image src="/GASCO LOGO OFFI.png" alt="GASCO Logo" width={36} height={36} className="rounded-xl" />

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
