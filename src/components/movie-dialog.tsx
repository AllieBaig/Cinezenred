import { useEffect, useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useUpsertMovie } from "@/lib/data";
import type { Movie } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  movie?: Movie | null;
  knownActors?: string[];
}

export function MovieDialog({ open, onOpenChange, movie, knownActors = [] }: Props) {
  const upsert = useUpsertMovie();
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [director, setDirector] = useState("");
  const [category, setCategory] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [actors, setActors] = useState<string[]>([]);
  const [actorInput, setActorInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showThisWeek, setShowThisWeek] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(movie?.title ?? "");
      setYear(movie?.year?.toString() ?? "");
      setDirector(movie?.director ?? "");
      setCategory(movie?.category ?? "");
      setPosterUrl(movie?.poster_url ?? "");
      setNotes(movie?.notes ?? "");
      setActors(movie?.actors ?? []);
      setTags(movie?.tags ?? []);
      setInWatchlist(movie?.in_watchlist ?? false);
      setShowThisWeek(movie?.show_this_week ?? false);
      setActorInput("");
      setTagInput("");
    }
  }, [open, movie]);

  const addActor = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (!actors.includes(v)) setActors([...actors, v]);
    setActorInput("");
  };
  const addTag = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };
  const onActorKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addActor(actorInput); }
    if (e.key === "Backspace" && !actorInput && actors.length) setActors(actors.slice(0, -1));
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    try {
      await upsert.mutateAsync({
        id: movie?.id,
        title: title.trim(),
        year: year ? parseInt(year, 10) || null : null,
        director: director.trim() || null,
        category: category.trim() || null,
        poster_url: posterUrl.trim() || null,
        notes: notes.trim() || null,
        actors,
        tags,
        in_watchlist: inWatchlist,
        show_this_week: showThisWeek,
      });
      toast.success(movie ? "Movie updated" : "Movie added");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const actorSuggestions = actorInput
    ? knownActors.filter((a) => a.toLowerCase().includes(actorInput.toLowerCase()) && !actors.includes(a)).slice(0, 5)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{movie ? "Edit movie" : "Add movie"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lost in Translation" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input id="year" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder="2003" />
            </div>
            <div>
              <Label htmlFor="director">Director</Label>
              <Input id="director" value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Sofia Coppola" />
            </div>
          </div>

          <div>
            <Label>Actors</Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 min-h-10 focus-within:ring-2 focus-within:ring-ring">
              {actors.map((a) => (
                <Badge key={a} variant="secondary" className="gap-1">
                  {a}
                  <button type="button" onClick={() => setActors(actors.filter((x) => x !== a))} aria-label={`Remove ${a}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                value={actorInput}
                onChange={(e) => setActorInput(e.target.value)}
                onKeyDown={onActorKey}
                onBlur={() => actorInput && addActor(actorInput)}
                placeholder={actors.length ? "" : "Add actor, press Enter"}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
              />
            </div>
            {actorSuggestions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {actorSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => addActor(s)} className="text-xs rounded-full border border-border px-2 py-0.5 hover:bg-accent hover:text-accent-foreground">
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 min-h-10 focus-within:ring-2 focus-within:ring-ring">
              {tags.map((t) => (
                <Badge key={t} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  #{t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKey}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={tags.length ? "" : "Add tag, press Enter"}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cat">Category</Label>
              <Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Drama, Sci-fi…" />
            </div>
            <div>
              <Label htmlFor="poster">Poster URL</Label>
              <Input id="poster" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did you think?" />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">In watchlist</p>
              <p className="text-xs text-muted-foreground">Save it for later</p>
            </div>
            <Switch checked={inWatchlist} onCheckedChange={setInWatchlist} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Show in This Week</p>
              <p className="text-xs text-muted-foreground">Highlight on home</p>
            </div>
            <Switch checked={showThisWeek} onCheckedChange={setShowThisWeek} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{movie ? "Save changes" : "Add movie"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
