
-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Movies
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INTEGER,
  director TEXT,
  poster_url TEXT,
  notes TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  actors TEXT[] NOT NULL DEFAULT '{}',
  in_watchlist BOOLEAN NOT NULL DEFAULT false,
  show_this_week BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Movies viewable by owner" ON public.movies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Movies insertable by owner" ON public.movies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Movies updatable by owner" ON public.movies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Movies deletable by owner" ON public.movies FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_movies_user ON public.movies(user_id);

-- Watch logs
CREATE TABLE public.watch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  watched_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (movie_id, watched_on)
);
ALTER TABLE public.watch_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs viewable by owner" ON public.watch_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Logs insertable by owner" ON public.watch_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Logs updatable by owner" ON public.watch_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Logs deletable by owner" ON public.watch_logs FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_logs_user_date ON public.watch_logs(user_id, watched_on DESC);
CREATE INDEX idx_logs_movie ON public.watch_logs(movie_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER movies_touch BEFORE UPDATE ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
