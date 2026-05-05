import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Award, Trophy, Eye, Clapperboard, Calendar, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMovies, useAllLogs } from "@/lib/data";

export const Route = createFileRoute("/_app/stats")({
  head: () => ({ meta: [{ title: "Stats — CineWatch" }] }),
  component: StatsPage,
});

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function StatsPage() {
  const { data: movies = [] } = useMovies();
  const { data: logs = [] } = useAllLogs();

  const stats = useMemo(() => {
    const total = logs.length;
    const unique = new Set(logs.map((l) => l.movie_id)).size;
    const xp = total * 10 + unique * 5;

    // Streak (consecutive days ending today/yesterday)
    const dates = new Set(logs.map((l) => l.watched_on));
    let streak = 0;
    const cursor = new Date();
    if (!dates.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dates.has(isoDate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

    // Director / decade / actor counts
    const dirCount = new Map<string, number>();
    const decadeCount = new Map<string, number>();
    const actorCount = new Map<string, number>();
    movies.forEach((m) => {
      if (m.director) dirCount.set(m.director, (dirCount.get(m.director) ?? 0) + m.watchCount);
      if (m.year) {
        const d = `${Math.floor(m.year / 10) * 10}s`;
        decadeCount.set(d, (decadeCount.get(d) ?? 0) + m.watchCount);
      }
      m.actors.forEach((a) => actorCount.set(a, (actorCount.get(a) ?? 0) + m.watchCount));
    });
    const topDirectors = [...dirCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topActors = [...actorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const decades = [...decadeCount.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const oldest = movies.filter((m) => m.year).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))[0];
    const newest = movies.filter((m) => m.year).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];

    // Heatmap: last 12 weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 12 * 7 + 1);
    const dayCount = new Map<string, number>();
    logs.forEach((l) => dayCount.set(l.watched_on, (dayCount.get(l.watched_on) ?? 0) + 1));
    const cells: { date: string; count: number }[] = [];
    for (let i = 0; i < 12 * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = isoDate(d);
      cells.push({ date: k, count: dayCount.get(k) ?? 0 });
    }

    // Monthly trend (last 6 months)
    const monthCount = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCount.set(k, 0);
    }
    logs.forEach((l) => {
      const k = l.watched_on.slice(0, 7);
      if (monthCount.has(k)) monthCount.set(k, (monthCount.get(k) ?? 0) + 1);
    });
    const monthly = [...monthCount.entries()];

    return { total, unique, xp, streak, topDirectors, topActors, decades, oldest, newest, cells, monthly };
  }, [movies, logs]);

  const badges = useMemo(() => {
    const list: { name: string; got: boolean; desc: string; icon: typeof Award }[] = [
      { name: "First Watch", desc: "Log your first movie", got: stats.total >= 1, icon: Eye },
      { name: "Cinephile", desc: "Watch 25 movies", got: stats.total >= 25, icon: Clapperboard },
      { name: "Binge Master", desc: "5-day streak", got: stats.streak >= 5, icon: Flame },
      { name: "Explorer", desc: "5 different decades", got: stats.decades.length >= 5, icon: Trophy },
    ];
    return list;
  }, [stats]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">Your watching life, by the numbers.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total watches" value={stats.total} icon={<Eye className="h-4 w-4" />} />
        <Stat label="Unique films" value={stats.unique} icon={<Clapperboard className="h-4 w-4" />} />
        <Stat label="Day streak" value={stats.streak} icon={<Flame className="h-4 w-4 text-accent" />} accent />
        <Stat label="XP" value={stats.xp} icon={<Trophy className="h-4 w-4" />} />
      </div>

      <Group title="Badges" icon={Award}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div key={b.name} className={`rounded-lg border p-3 ${b.got ? "border-accent/40 bg-accent/5" : "border-border opacity-60"}`}>
              <b.icon className={`h-5 w-5 ${b.got ? "text-accent" : "text-muted-foreground"}`} />
              <div className="mt-2 text-sm font-medium">{b.name}</div>
              <div className="text-xs text-muted-foreground">{b.desc}</div>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Activity heatmap" icon={Calendar}>
        <div className="space-y-2">
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
            {stats.cells.map((c) => (
              <div
                key={c.date}
                title={`${c.date}: ${c.count}`}
                className={`h-3 w-3 rounded-sm heatmap-cell-${Math.min(4, c.count)}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Less
            {[0, 1, 2, 3, 4].map((n) => <div key={n} className={`h-3 w-3 rounded-sm heatmap-cell-${n}`} />)}
            More
          </div>
        </div>
      </Group>

      <Group title="Monthly trend" icon={Calendar}>
        <div className="flex items-end gap-2 h-32">
          {stats.monthly.map(([k, v]) => {
            const max = Math.max(1, ...stats.monthly.map(([, x]) => x));
            return (
              <div key={k} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-accent/80" style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} />
                <div className="text-[10px] text-muted-foreground">{k.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </Group>

      <Group title="Director spotlight" icon={Award}>
        <RankedList items={stats.topDirectors} empty="Add directors to see spotlight" />
      </Group>

      <Group title="Top actors" icon={Award}>
        <RankedList items={stats.topActors} empty="Add actors to see top picks" />
      </Group>

      <Group title="Release era explorer" icon={Calendar}>
        {stats.decades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add years to your movies.</p>
        ) : (
          <div className="space-y-1">
            {stats.decades.map(([d, n]) => {
              const max = Math.max(...stats.decades.map(([, x]) => x));
              return (
                <div key={d} className="flex items-center gap-3 text-sm">
                  <div className="w-12 font-mono text-muted-foreground">{d}</div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-foreground" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <div className="w-8 text-right tabular-nums">{n}</div>
                </div>
              );
            })}
            {stats.oldest && stats.newest && (
              <p className="text-xs text-muted-foreground pt-2">
                Oldest: <span className="text-foreground">{stats.oldest.title} ({stats.oldest.year})</span>
                {" · "}
                Newest: <span className="text-foreground">{stats.newest.title} ({stats.newest.year})</span>
              </p>
            )}
          </div>
        )}
      </Group>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-accent/40 bg-accent/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        {label}
        {icon}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Group({ title, icon: Icon, children }: { title: string; icon: typeof Award; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function RankedList({ items, empty }: { items: [string, number][]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map(([, n]) => n));
  return (
    <div className="space-y-1.5">
      {items.map(([name, n], i) => (
        <div key={name} className="flex items-center gap-3 text-sm">
          <div className="w-5 text-xs font-mono text-muted-foreground">#{i + 1}</div>
          <div className="flex-1 truncate">{name}</div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <div className="w-8 text-right tabular-nums text-muted-foreground">{n}</div>
        </div>
      ))}
    </div>
  );
}
