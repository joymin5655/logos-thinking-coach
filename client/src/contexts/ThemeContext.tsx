import React, { createContext, useContext, useEffect, useState } from "react";

// 사용자가 고른 값(system이면 OS 설정을 따른다)과 실제 적용된 값.
export type ThemePref = "light" | "dark" | "system";
type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "logos.theme";
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const media = () => (typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* 저장소 접근 불가 — 기본값 */
  }
  return "system";
}

const resolve = (p: ThemePref): Theme => (p === "system" ? (media()?.matches ? "dark" : "light") : p);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [theme, setTheme] = useState<Theme>(() => resolve(readPref()));

  useEffect(() => {
    setTheme(resolve(pref));
    if (pref !== "system") return;
    const m = media();
    const onChange = () => setTheme(resolve("system"));
    m?.addEventListener("change", onChange);
    return () => m?.removeEventListener("change", onChange);
  }, [pref]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0A0A0A" : "#F0EBE0");
  }, [theme]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* 무시 */
    }
  };
  const toggleTheme = () => setPref(theme === "dark" ? "light" : "dark");

  return <ThemeContext.Provider value={{ theme, pref, setPref, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
