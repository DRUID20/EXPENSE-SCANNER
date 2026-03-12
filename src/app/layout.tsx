import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gasco Energy | ExpenseTracker",
  description:
    "Smart AI-powered expense tracking for Gasco Energy. Scan receipts, auto-categorize expenses, and streamline approvals.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ExpenseTracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#03D47C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="midnight-glass" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <ThemeProvider>
          <AppThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <OfflineIndicator />
              {children}
              <InstallPrompt />
              <ServiceWorkerRegistration />
            </ToastProvider>
          </AuthProvider>
          </AppThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
