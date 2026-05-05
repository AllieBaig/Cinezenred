import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Movie, MovieWithStats, WatchLog } from "./types";

const MOVIES_KEY = "cw-movies";
const LOGS_KEY = "cw-logs";
const LOCAL_USER = "local";

function readMovies(): Movie[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(MOVIES_KEY);
    return raw ? (JSON.parse(raw) as Movie[]) : [];
  } catch {
    return [];
  }
}

function readLogs(): WatchLog[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? (JSON.parse(raw) as WatchLog[]) : [];
  } catch {
    return [];
  }
}

function writeMovies(m: Movie[]) {
  localStorage.setItem(MOVIES_KEY, JSON.stringify(m));
}
function writeLogs(l: WatchLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(l));
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function withStats(movies: Movie[], logs: WatchLog[]): MovieWithStats[] {
  const byMovie = new Map<string, WatchLog[]>();
  [...logs]
    .sort((a, b) => b.watched_on.localeCompare(a.watched_on))
    .forEach((l) => {
      const arr = byMovie.get(l.movie_id) ?? [];
      arr.push(l);
      byMovie.set(l.movie_id, arr);
    });
  return movies.map((m) => {
    const ml = byMovie.get(m.id) ?? [];
    const last = ml[0]?.watched_on ?? null;
    const days = last
      ? Math.floor((Date.now() - new Date(last + "T00:00:00").getTime()) / 86400000)
      : null;
    return { ...m, logs: ml, watchCount: ml.length, lastWatched: last, daysSince: days };
  });
}

export function useMovies() {
  return useQuery({
    queryKey: ["movies"],
    queryFn: async (): Promise<MovieWithStats[]> => {
      const movies = readMovies().sort((a, b) => b.created_at.localeCompare(a.created_at));
      return withStats(movies, readLogs());
    },
  });
}

export function useAllLogs() {
  return useQuery({
    queryKey: ["logs"],
    queryFn: async (): Promise<WatchLog[]> =>
      readLogs().sort((a, b) => b.watched_on.localeCompare(a.watched_on)),
  });
}

export function useUpsertMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Movie> & { title: string }) => {
      const movies = readMovies();
      const now = new Date().toISOString();
      if (input.id) {
        const idx = movies.findIndex((m) => m.id === input.id);
        if (idx === -1) throw new Error("Movie not found");
        const merged: Movie = { ...movies[idx], ...input, id: input.id, updated_at: now };
        movies[idx] = merged;
        writeMovies(movies);
        return merged;
      }
      const created: Movie = {
        id: uid(),
        user_id: LOCAL_USER,
        title: input.title,
        year: input.year ?? null,
        director: input.director ?? null,
        poster_url: input.poster_url ?? null,
        notes: input.notes ?? null,
        category: input.category ?? null,
        tags: input.tags ?? [],
        actors: input.actors ?? [],
        in_watchlist: input.in_watchlist ?? false,
        show_this_week: input.show_this_week ?? false,
        created_at: now,
        updated_at: now,
      };
      writeMovies([created, ...movies]);
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      writeMovies(readMovies().filter((m) => m.id !== id));
      writeLogs(readLogs().filter((l) => l.movie_id !== id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movies"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useLogWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ movie_id, watched_on }: { movie_id: string; watched_on: string }) => {
      const logs = readLogs();
      if (logs.some((l) => l.movie_id === movie_id && l.watched_on === watched_on)) {
        throw new Error("Already logged for that day");
      }
      const log: WatchLog = {
        id: uid(),
        user_id: LOCAL_USER,
        movie_id,
        watched_on,
        created_at: new Date().toISOString(),
      };
      writeLogs([log, ...logs]);
      return log;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movies"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      writeLogs(readLogs().filter((l) => l.id !== id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movies"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

// ---------- Backup / Restore ----------

export interface BackupFile {
  exportedAt: string;
  version: number;
  movies: Movie[];
  logs: WatchLog[];
}

export function exportBackup(): BackupFile {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    movies: readMovies(),
    logs: readLogs(),
  };
}

function isMovie(m: unknown): m is Movie {
  if (!m || typeof m !== "object") return false;
  const x = m as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.title === "string" &&
    Array.isArray(x.tags) &&
    Array.isArray(x.actors)
  );
}

function isLog(l: unknown): l is WatchLog {
  if (!l || typeof l !== "object") return false;
  const x = l as Record<string, unknown>;
  return typeof x.id === "string" && typeof x.movie_id === "string" && typeof x.watched_on === "string";
}

export function validateBackup(data: unknown): BackupFile {
  if (!data || typeof data !== "object") throw new Error("Invalid backup file");
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.movies) || !Array.isArray(d.logs)) {
    throw new Error("Backup missing movies or logs");
  }
  if (!d.movies.every(isMovie)) throw new Error("Backup contains invalid movie entries");
  if (!d.logs.every(isLog)) throw new Error("Backup contains invalid log entries");
  return {
    exportedAt: typeof d.exportedAt === "string" ? d.exportedAt : new Date().toISOString(),
    version: typeof d.version === "number" ? d.version : 1,
    movies: d.movies as Movie[],
    logs: d.logs as WatchLog[],
  };
}

// ---------- Old → New Conversion ----------

export type ConversionResult = {
  backup: BackupFile;
  movies: number;
  logs: number;
  source: "new" | "old";
};

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string")
    return v
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function asYear(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toIsoDay(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return null;
  }
  return d.toISOString().slice(0, 10);
}

/** Heuristic: data is "new" if it already matches BackupFile validation. */
export function isNewFormat(data: unknown): boolean {
  try {
    validateBackup(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a flexible "old" payload into the current BackupFile shape.
 * Accepts:
 *  - { movies: [...] } where each movie may carry inline watch dates
 *  - bare arrays of movies
 *  - common alternate field names: name/title, cast/actors, genre/category,
 *    watchedDates/watched_dates/history, dateAdded/createdAt
 */
export function convertOldBackup(data: unknown): BackupFile {
  const root = (Array.isArray(data) ? { movies: data } : data) as Record<string, unknown> | null;
  if (!root || typeof root !== "object") throw new Error("Unrecognized data shape");
  const rawMovies = (root.movies ?? root.items ?? root.library ?? []) as unknown;
  if (!Array.isArray(rawMovies)) throw new Error("Could not find a movies array");

  const now = new Date().toISOString();
  const movies: Movie[] = [];
  const logs: WatchLog[] = [];

  for (const rawUnknown of rawMovies) {
    if (!rawUnknown || typeof rawUnknown !== "object") continue;
    const r = rawUnknown as Record<string, unknown>;
    const title = (r.title ?? r.name ?? r.movie ?? "") as string;
    if (!title || typeof title !== "string") continue;
    const id =
      (typeof r.id === "string" && r.id) ||
      (typeof r._id === "string" && r._id) ||
      uid();
    const created =
      (typeof r.created_at === "string" && r.created_at) ||
      (typeof r.createdAt === "string" && r.createdAt) ||
      (typeof r.dateAdded === "string" && r.dateAdded) ||
      now;
    const movie: Movie = {
      id,
      user_id: LOCAL_USER,
      title,
      year: asYear(r.year ?? r.releaseYear),
      director: (r.director as string) ?? null,
      poster_url: (r.poster_url as string) ?? (r.poster as string) ?? (r.image as string) ?? null,
      notes: (r.notes as string) ?? (r.note as string) ?? (r.comment as string) ?? null,
      category: (r.category as string) ?? (r.genre as string) ?? null,
      tags: asArray(r.tags),
      actors: asArray(r.actors ?? r.cast),
      in_watchlist: Boolean(r.in_watchlist ?? r.watchlist ?? r.inWatchlist ?? false),
      show_this_week: Boolean(r.show_this_week ?? r.thisWeek ?? false),
      created_at: created,
      updated_at: (r.updated_at as string) ?? created,
    };
    movies.push(movie);

    const dateSources = [
      r.watched_dates,
      r.watchedDates,
      r.history,
      r.watchHistory,
      r.dates,
      r.logs,
    ];
    const seen = new Set<string>();
    for (const src of dateSources) {
      if (!Array.isArray(src)) continue;
      for (const entry of src) {
        const day =
          typeof entry === "object" && entry !== null
            ? toIsoDay(
                (entry as Record<string, unknown>).watched_on ??
                  (entry as Record<string, unknown>).date ??
                  (entry as Record<string, unknown>).day,
              )
            : toIsoDay(entry);
        if (!day || seen.has(day)) continue;
        seen.add(day);
        logs.push({
          id: uid(),
          user_id: LOCAL_USER,
          movie_id: id,
          watched_on: day,
          created_at: now,
        });
      }
    }
    const single = toIsoDay(r.watched_on ?? r.lastWatched ?? r.last_watched);
    if (single && !seen.has(single)) {
      logs.push({
        id: uid(),
        user_id: LOCAL_USER,
        movie_id: id,
        watched_on: single,
        created_at: now,
      });
    }
  }

  if (movies.length === 0) throw new Error("No movies found in old data");
  return { exportedAt: new Date().toISOString(), version: 1, movies, logs };
}

/** Detect format and return a normalized new-format backup. */
export function detectAndConvert(data: unknown): ConversionResult {
  if (isNewFormat(data)) {
    const backup = validateBackup(data);
    return { backup, movies: backup.movies.length, logs: backup.logs.length, source: "new" };
  }
  const backup = convertOldBackup(data);
  return { backup, movies: backup.movies.length, logs: backup.logs.length, source: "old" };
}

export function importBackup(data: BackupFile, mode: "merge" | "replace") {
  if (mode === "replace") {
    writeMovies(data.movies);
    writeLogs(data.logs);
    return { movies: data.movies.length, logs: data.logs.length };
  }
  const movies = readMovies();
  const logs = readLogs();
  const movieIds = new Set(movies.map((m) => m.id));
  const logKey = (l: WatchLog) => `${l.movie_id}::${l.watched_on}`;
  const logKeys = new Set(logs.map(logKey));
  const newMovies = data.movies.filter((m) => !movieIds.has(m.id));
  const newLogs = data.logs.filter((l) => !logKeys.has(logKey(l)));
  writeMovies([...newMovies, ...movies]);
  writeLogs([...newLogs, ...logs]);
  return { movies: newMovies.length, logs: newLogs.length };
}
