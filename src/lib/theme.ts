import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const KEY = "cw-theme";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === "undefined") return "system";
    return (localStorage.getItem(KEY) as Theme) || "system";
  });

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const h = () => apply("system");
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [theme]);

  return { theme, setTheme };
}
