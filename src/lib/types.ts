export type Movie = {
  id: string;
  user_id: string;
  title: string;
  year: number | null;
  director: string | null;
  poster_url: string | null;
  notes: string | null;
  category: string | null;
  tags: string[];
  actors: string[];
  in_watchlist: boolean;
  show_this_week: boolean;
  created_at: string;
  updated_at: string;
};

export type WatchLog = {
  id: string;
  user_id: string;
  movie_id: string;
  watched_on: string; // YYYY-MM-DD
  created_at: string;
};

export type MovieWithStats = Movie & {
  logs: WatchLog[];
  watchCount: number;
  lastWatched: string | null;
  daysSince: number | null;
};
