import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "web-push"],
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "framer-motion"],
  },
};

export default nextConfig;
