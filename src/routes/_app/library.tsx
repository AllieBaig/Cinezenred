import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, LayoutGrid, List as ListIcon, Shuffle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMovies } from "@/lib/data";
import { useSettings } from "@/lib/settings";
import { MovieCard } from "@/components/movie-card";
import { MovieDialog } from "@/components/movie-dialog";

export const Route = createFileRoute("/_app/library")({
  head: () => ({ meta: [{ title: "Library — CineWatch" }] }),
  component: LibraryPage,
});

type SortKey = "recent" | "title" | "year" | "watched" | "gap";
type GroupKey = "none" | "category" | "decade" | "actor";

function LibraryPage() {
  const { data: movies = [], isLoading } = useMovies();
  const { settings, update } = useSettings();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [group, setGroup] = useState<GroupKey>("none");
  const [adding, setAdding] = useState(false);

  const knownActors = useMemo(() => {
    const s = new Set<string>();
    movies.forEach((m) => m.actors.forEach((a) => s.add(a)));
    return Array.from(s).sort();
  }, [movies]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = movies.filter((m) => !m.in_watchlist);
    if (term) {
      list = list.filter((m) =>
        m.title.toLowerCase().includes(term) ||
        m.director?.toLowerCase().includes(term) ||
        m.actors.some((a) => a.toLowerCase().includes(term)) ||
        m.tags.some((t) => t.toLowerCase().includes(term)) ||
        m.category?.toLowerCase().includes(term),
      );
    }
    switch (sort) {
      case "title": list = [...list].sort((a, b) => a.title.localeCompare(b.title)); break;
      case "year": list = [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); break;
      case "watched": list = [...list].sort((a, b) => b.watchCount - a.watchCount); break;
      case "gap": list = [...list].sort((a, b) => (b.daysSince ?? -1) - (a.daysSince ?? -1)); break;
      default: list = [...list].sort((a, b) => (b.lastWatched ?? "").localeCompare(a.lastWatched ?? ""));
    }
    return list;
  }, [movies, q, sort]);

  const grouped = useMemo(() => {
    if (group === "none") return [{ key: "All", items: filtered }];
    const map = new Map<string, typeof filtered>();
    filtered.forEach((m) => {
      let keys: string[] = ["—"];
      if (group === "category") keys = [m.category || "Uncategorized"];
      else if (group === "decade") keys = [m.year ? `${Math.floor(m.year / 10) * 10}s` : "Unknown"];
      else if (group === "actor") keys = m.actors.length ? m.actors : ["Solo"];
      keys.forEach((k) => {
        const arr = map.get(k) ?? [];
        arr.push(m);
        map.set(k, arr);
      });
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items })).sort((a, b) => b.items.length - a.items.length);
  }, [filtered, group]);

  const thisWeek = movies.filter((m) => m.show_this_week);

  const shufflePick = () => {
    const candidates = movies.filter((m) => !m.in_watchlist);
    if (!candidates.length) return;
    // weight by daysSince (longer = higher weight)
    const weighted = candidates.map((m) => ({ m, w: Math.max(1, m.daysSince ?? 365) }));
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of weighted) { r -= x.w; if (r <= 0) { nav({ to: "/movie/$movieId", params: { movieId: x.m.id } }); return; } }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">{movies.filter((m) => !m.in_watchlist).length} movies · {movies.reduce((s, m) => s + m.watchCount, 0)} watches</p>
      </header>

      {settings.showThisWeek && thisWeek.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This week</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
            {thisWeek.map((m, i) => (
              <div key={m.id} className="w-28 shrink-0">
                <MovieCard movie={m} index={i} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search movies, actors, tags…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently watched</SelectItem>
              <SelectItem value="title">Title A→Z</SelectItem>
              <SelectItem value="year">Year (new first)</SelectItem>
              <SelectItem value="watched">Most watched</SelectItem>
              <SelectItem value="gap">Longest gap</SelectItem>
            </SelectContent>
          </Select>
          <Select value={group} onValueChange={(v) => setGroup(v as GroupKey)}>
            <SelectTrigger className="h-9 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="category">By category</SelectItem>
              <SelectItem value="decade">By decade</SelectItem>
              <SelectItem value="actor">By actor</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={shufflePick} disabled={!movies.length}>
              <Shuffle className="h-4 w-4 mr-1" />Shuffle
            </Button>
            <Button variant={settings.layout === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => update("layout", "grid")} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={settings.layout === "list" ? "secondary" : "ghost"} size="icon" onClick={() => update("layout", "list")} aria-label="List view">
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading your library…</div>
      ) : !movies.length ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <div className="space-y-8">
          <AnimatePresence>
            {grouped.map((g) => (
              <motion.section key={g.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {group !== "none" && (
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.key} <span className="text-muted-foreground/60">({g.items.length})</span>
                  </h3>
                )}
                {settings.layout === "grid" ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {g.items.map((m, i) => <MovieCard key={m.id} movie={m} index={i} />)}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {g.items.map((m, i) => <MovieCard key={m.id} movie={m} layout="list" index={i} />)}
                  </div>
                )}
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}

      <button
        onClick={() => setAdding(true)}
        aria-label="Add movie"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-elevated hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      <MovieDialog open={adding} onOpenChange={setAdding} knownActors={knownActors} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold">Your library is empty</h3>
      <p className="mt-1 text-sm text-muted-foreground">Add the first movie you've watched to start your journal.</p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="h-4 w-4 mr-1" />Add movie
      </Button>
    </div>
  );
}
