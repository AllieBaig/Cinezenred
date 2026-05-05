import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Shuffle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovies } from "@/lib/data";
import { MovieCard } from "@/components/movie-card";

export const Route = createFileRoute("/_app/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — CineWatch" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { data: movies = [] } = useMovies();
  const nav = useNavigate();

  const watchlist = useMemo(() => movies.filter((m) => m.in_watchlist), [movies]);

  // Smart "Watch Today" pick: random unwatched (no logs) preferred, else random
  const pickToday = () => {
    if (!watchlist.length) return;
    const fresh = watchlist.filter((m) => m.watchCount === 0);
    const pool = fresh.length ? fresh : watchlist;
    const m = pool[Math.floor(Math.random() * pool.length)];
    nav({ to: "/movie/$movieId", params: { movieId: m.id } });
  };

  const shuffle = () => {
    if (!watchlist.length) return;
    const m = watchlist[Math.floor(Math.random() * watchlist.length)];
    nav({ to: "/movie/$movieId", params: { movieId: m.id } });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-sm text-muted-foreground">{watchlist.length} films waiting for you</p>
      </header>

      {watchlist.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={pickToday} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Sparkles className="h-4 w-4 mr-1" />Watch today
          </Button>
          <Button variant="outline" onClick={shuffle}>
            <Shuffle className="h-4 w-4 mr-1" />Shuffle
          </Button>
        </div>
      )}

      {watchlist.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <h3 className="font-display text-xl font-semibold">Nothing on the list</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add a movie from your library and toggle "In watchlist".</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {watchlist.map((m, i) => <MovieCard key={m.id} movie={m} index={i} />)}
        </div>
      )}
    </div>
  );
}
