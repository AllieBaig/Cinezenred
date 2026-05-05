import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Edit2, Trash2, Plus, Calendar as CalIcon, Eye } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useMovies, useLogWatch, useDeleteLog, useDeleteMovie, useUpsertMovie } from "@/lib/data";
import { MovieDialog } from "@/components/movie-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/movie/$movieId")({
  component: MovieDetailPage,
});

function MovieDetailPage() {
  const { movieId } = Route.useParams();
  const nav = useNavigate();
  const { data: movies = [] } = useMovies();
  const movie = movies.find((m) => m.id === movieId);
  const log = useLogWatch();
  const delLog = useDeleteLog();
  const delMovie = useDeleteMovie();
  const upsert = useUpsertMovie();
  const [editing, setEditing] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  const knownActors = useMemo(() => {
    const s = new Set<string>();
    movies.forEach((m) => m.actors.forEach((a) => s.add(a)));
    return Array.from(s).sort();
  }, [movies]);

  if (!movie) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground text-sm">Movie not found.</p>
        <Link to="/library" className="text-sm underline mt-2 inline-block">Back to library</Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const watchedToday = movie.logs.some((l) => l.watched_on === today);

  const onLog = async (date: Date) => {
    try {
      await log.mutateAsync({ movie_id: movie.id, watched_on: date.toISOString().slice(0, 10) });
      toast.success("Logged");
      setCalOpen(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  const onRewatch = async () => {
    if (watchedToday) { toast.info("Already logged today"); return; }
    try {
      await log.mutateAsync({ movie_id: movie.id, watched_on: today });
      toast.success("Re-watch logged");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <Link to="/library" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />Library
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid sm:grid-cols-[180px_1fr] gap-5"
      >
        <div className="aspect-[2/3] w-32 sm:w-44 rounded-lg overflow-hidden bg-muted">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No poster</div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">{movie.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {[movie.year, movie.director].filter(Boolean).join(" · ") || "—"}
          </p>
          {movie.category && <Badge variant="secondary" className="mt-2">{movie.category}</Badge>}

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Box label="Watches" value={movie.watchCount} />
            <Box label="Days since" value={movie.daysSince === null ? "—" : movie.daysSince === 0 ? "Today" : movie.daysSince} />
            <Box label="Last" value={movie.lastWatched ? format(new Date(movie.lastWatched + "T00:00:00"), "MMM d") : "—"} />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={onRewatch} disabled={watchedToday} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Eye className="h-4 w-4 mr-1" />{watchedToday ? "Watched today" : "Watched today"}
            </Button>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline"><CalIcon className="h-4 w-4 mr-1" />Past date</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  onSelect={(d) => d && onLog(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" />Edit
            </Button>
          </div>
        </div>
      </motion.div>

      {(movie.actors.length > 0 || movie.tags.length > 0) && (
        <section className="space-y-3">
          {movie.actors.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Cast</h3>
              <div className="flex flex-wrap gap-1.5">
                {movie.actors.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
              </div>
            </div>
          )}
          {movie.tags.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {movie.tags.map((t) => <Badge key={t} className="bg-accent/10 text-accent border border-accent/30">#{t}</Badge>)}
              </div>
            </div>
          )}
        </section>
      )}

      {movie.notes && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</h3>
          <p className="text-sm whitespace-pre-wrap">{movie.notes}</p>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Watch history</h3>
          <span className="text-xs text-muted-foreground">{movie.logs.length} entries</span>
        </div>
        {movie.logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No watches yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {movie.logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{format(new Date(l.watched_on + "T00:00:00"), "EEEE, MMM d, yyyy")}</span>
                <button
                  onClick={async () => { await delLog.mutateAsync(l.id); toast.success("Removed"); }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove log"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">In watchlist</p>
            <p className="text-xs text-muted-foreground">Save it for later</p>
          </div>
          <Switch
            checked={movie.in_watchlist}
            onCheckedChange={async (v) => { await upsert.mutateAsync({ id: movie.id, title: movie.title, in_watchlist: v }); }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Show in This Week</p>
            <p className="text-xs text-muted-foreground">Highlight on home</p>
          </div>
          <Switch
            checked={movie.show_this_week}
            onCheckedChange={async (v) => { await upsert.mutateAsync({ id: movie.id, title: movie.title, show_this_week: v }); }}
          />
        </div>
      </section>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-1" />Delete movie
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{movie.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the movie and all its watch logs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { await delMovie.mutateAsync(movie.id); toast.success("Deleted"); nav({ to: "/library" }); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MovieDialog open={editing} onOpenChange={setEditing} movie={movie} knownActors={knownActors} />
    </div>
  );
}

function Box({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
