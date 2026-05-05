import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Film, Eye } from "lucide-react";
import type { MovieWithStats } from "@/lib/types";

export function MovieCard({ movie, layout = "grid", index = 0 }: { movie: MovieWithStats; layout?: "grid" | "list"; index?: number }) {
  if (layout === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.2) }}
      >
        <Link
          to="/movie/$movieId"
          params={{ movieId: movie.id }}
          className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-foreground/30 transition-colors"
        >
          <Poster movie={movie} className="h-16 w-12 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-sm">{movie.title}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {[movie.year, movie.director].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{movie.watchCount}</span>
              {movie.daysSince !== null && <span>· {movie.daysSince === 0 ? "today" : `${movie.daysSince}d ago`}</span>}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
    >
      <Link to="/movie/$movieId" params={{ movieId: movie.id }} className="group block">
        <Poster movie={movie} className="aspect-[2/3] w-full rounded-lg" />
        <div className="mt-2 px-0.5">
          <h3 className="truncate text-sm font-medium leading-tight">{movie.title}</h3>
          <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
            <span className="truncate">{movie.year ?? "—"}</span>
            <span className="inline-flex items-center gap-1 shrink-0"><Eye className="h-3 w-3" />{movie.watchCount}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Poster({ movie, className }: { movie: MovieWithStats; className?: string }) {
  if (movie.poster_url) {
    return (
      <img
        src={movie.poster_url}
        alt={movie.title}
        loading="lazy"
        className={`object-cover bg-muted ${className ?? ""}`}
      />
    );
  }
  // Generate hue from title
  let hash = 0;
  for (let i = 0; i < movie.title.length; i++) hash = movie.title.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className={`flex flex-col items-center justify-center text-foreground/70 ${className ?? ""}`}
      style={{
        background: `linear-gradient(140deg, oklch(0.85 0.06 ${hue}), oklch(0.65 0.12 ${(hue + 60) % 360}))`,
      }}
    >
      <Film className="h-1/4 w-1/4 opacity-50" />
      <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-wider opacity-70 mt-1 line-clamp-2">
        {movie.title}
      </span>
    </div>
  );
}
