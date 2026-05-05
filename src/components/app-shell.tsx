import { Link, useLocation } from "@tanstack/react-router";
import { Film, ListVideo, BarChart3, Settings as SettingsIcon, Sun, Moon, Laptop } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

const tabs = [
  { to: "/library" as const, label: "Library", icon: Film },
  { to: "/watchlist" as const, label: "Watchlist", icon: ListVideo },
  { to: "/stats" as const, label: "Stats", icon: BarChart3 },
  { to: "/settings" as const, label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const loc = useLocation();

  return (
    <div className="min-h-screen flex flex-col pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/library" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <Film className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">CineWatch</span>
          </Link>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Theme">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}><Laptop className="mr-2 h-4 w-4" />System</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 pt-4 pb-24">{children}</main>

      <nav className="glass fixed bottom-0 inset-x-0 z-40 border-t border-border/60 pb-[max(env(safe-area-inset-bottom),0px)]">
        <div className="mx-auto grid max-w-5xl grid-cols-4 px-2">
          {tabs.map((t) => {
            const active = loc.pathname === t.to || loc.pathname.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to} className="relative flex flex-col items-center justify-center py-2.5 text-xs font-medium">
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`} />
                <span className={`mt-0.5 ${active ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</span>
                {active && (
                  <motion.span layoutId="tab-pill" className="absolute -top-px h-px w-10 bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
