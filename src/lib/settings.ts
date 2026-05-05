import { useEffect, useState } from "react";

export type ViewLayout = "grid" | "list";
export type Density = "comfortable" | "compact";

export interface Settings {
  layout: ViewLayout;
  density: Density;
  showRecommendations: boolean;
  showWatchlist: boolean;
  showThisWeek: boolean;
  reduceMotion: boolean;
  largeText: boolean;
}

const DEFAULTS: Settings = {
  layout: "grid",
  density: "comfortable",
  showRecommendations: true,
  showWatchlist: true,
  showThisWeek: true,
  reduceMotion: false,
  largeText: false,
};

const KEY = "cw-settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof localStorage === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
    document.documentElement.style.fontSize = settings.largeText ? "17px" : "16px";
  }, [settings]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  return { settings, update };
}
