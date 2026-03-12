"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppTheme = "emerald-slate" | "midnight-glass" | "ivory-corporate";

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "midnight-glass",
  setTheme: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("midnight-glass");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("app-theme") as AppTheme | null;
    if (saved && ["emerald-slate", "midnight-glass", "ivory-corporate"].includes(saved)) {
      setThemeState(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);

    // Update color-scheme for browser UI
    const isLight = theme === "emerald-slate" || theme === "ivory-corporate";
    document.documentElement.style.colorScheme = isLight ? "light" : "dark";
    document.documentElement.classList.toggle("dark", !isLight);
  }, [theme, mounted]);

  const setTheme = (t: AppTheme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
