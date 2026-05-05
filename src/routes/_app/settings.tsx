import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/lib/settings";
import { useMovies, useAllLogs, exportBackup, importBackup, validateBackup, detectAndConvert, type BackupFile } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — CineWatch" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update } = useSettings();
  const { theme, setTheme } = useTheme();
  const { data: movies = [] } = useMovies();
  const { data: logs = [] } = useAllLogs();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const convertRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<(BackupFile & { __source?: "new" | "old" }) | null>(null);

  const exportData = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `cinewatch-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const valid = validateBackup(json);
      setPending(valid);
    } catch (err) {
      toast.error((err as Error).message || "Could not read file");
    }
  };

  const onPickConvertFile = () => convertRef.current?.click();

  const downloadBackup = (data: BackupFile, label: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `cinewatch-${label}-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onConvertChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = detectAndConvert(json);
      if (result.source === "new") {
        toast.info("File is already in the new format");
      } else {
        toast.success(`Old data detected — converted ${result.movies} movies, ${result.logs} logs`);
      }
      // Backup current data first, then offer merge/replace
      try {
        downloadBackup(exportBackup(), "pre-convert-backup");
      } catch {
        // ignore
      }
      downloadBackup(result.backup, "converted");
      setPending({ ...result.backup, __source: result.source });
    } catch (err) {
      toast.error(`Conversion failed: ${(err as Error).message}`);
    }
  };

  const applyImport = (mode: "merge" | "replace") => {
    if (!pending) return;
    try {
      const res = importBackup(pending, mode);
      qc.invalidateQueries({ queryKey: ["movies"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      toast.success(
        mode === "replace"
          ? `Replaced with ${pending.movies.length} movies, ${pending.logs.length} logs`
          : `Merged ${res.movies} new movies, ${res.logs} new logs`,
      );
      setPending(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Section title="Viewing">
        <Row label="Default layout" hint="Library default view">
          <Select value={settings.layout} onValueChange={(v) => update("layout", v as "grid" | "list")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Density" hint="Compact saves space">
          <Select value={settings.density} onValueChange={(v) => update("density", v as "compact" | "comfortable")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Theme">
          <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Show This Week section" hint="Highlight tagged movies on home">
          <Switch checked={settings.showThisWeek} onCheckedChange={(v) => update("showThisWeek", v)} />
        </Row>
        <Row label="Show watchlist tab" hint="Hide if you prefer">
          <Switch checked={settings.showWatchlist} onCheckedChange={(v) => update("showWatchlist", v)} />
        </Row>
      </Section>

      <Section title="Recommendations">
        <Row label="Smart picks" hint="Re-watch suggestions based on gap">
          <Switch checked={settings.showRecommendations} onCheckedChange={(v) => update("showRecommendations", v)} />
        </Row>
      </Section>

      <Section title="Accessibility">
        <Row label="Larger text" hint="Increases base font size">
          <Switch checked={settings.largeText} onCheckedChange={(v) => update("largeText", v)} />
        </Row>
        <Row label="Reduce motion" hint="Less animation">
          <Switch checked={settings.reduceMotion} onCheckedChange={(v) => update("reduceMotion", v)} />
        </Row>
      </Section>

      <Section title="Data">
        <Row label="Library" hint={`${movies.length} movies · ${logs.length} watch logs`}>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
            <Button variant="outline" size="sm" onClick={onPickFile}>
              <Upload className="h-4 w-4 mr-1" />Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onFileChosen}
            />
          </div>
        </Row>
        <Row label="Convert old data" hint="Import a legacy JSON file and convert it to the current format">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPickConvertFile}>
              <Upload className="h-4 w-4 mr-1" />Convert
            </Button>
            <input
              ref={convertRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onConvertChosen}
            />
          </div>
        </Row>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Your data is stored on this device. Export creates a JSON backup; import merges or replaces it.
            Convert auto-detects old-format files, downloads a safety backup of your current data and the converted file, then asks before applying.
          </p>
        </div>
      </Section>

      <p className="text-xs text-muted-foreground text-center pt-4">CineWatch · v1.0</p>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.__source === "old" ? "Apply converted data?" : "Import backup?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  Found <strong>{pending.movies.length}</strong> movies and{" "}
                  <strong>{pending.logs.length}</strong> watch logs.
                  <br />
                  <strong>Merge</strong> adds new entries to your library.
                  <strong> Replace</strong> overwrites everything currently on this device.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => applyImport("replace")}
            >
              Replace
            </AlertDialogAction>
            <AlertDialogAction onClick={() => applyImport("merge")}>Merge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium block">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
