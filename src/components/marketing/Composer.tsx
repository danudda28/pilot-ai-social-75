import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Check, ImagePlus, X } from "lucide-react";
import { BRIEF_KEY, buildStoryboard, type Storyboard } from "@/lib/credits";

type Photo = { url: string; name: string };

export function Composer({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [board, setBoard] = useState<Storyboard | null>(null);
  const [error, setError] = useState("");

  const countLabel = useMemo(() => {
    if (photos.length === 0) return null;
    return `${photos.length} ${photos.length === 1 ? "poză" : "poze"} atașate`;
  }, [photos.length]);

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const next = [...photos];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/") || next.length >= 6) continue;
      next.push({ url: URL.createObjectURL(file), name: file.name });
    }
    setPhotos(next);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const copy = [...current];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  }

  function preview() {
    if (text.trim().length < 24) {
      setError("Scrie măcar două fraze despre afacere.");
      setBoard(null);
      return;
    }
    const storyboard = buildStoryboard(text);
    setError("");
    setBoard(storyboard);
    sessionStorage.setItem(
      BRIEF_KEY,
      JSON.stringify({ text: text.trim(), photoCount: photos.length, storyboard }),
    );
  }

  function keep() {
    if (!board) preview();
    navigate({ to: "/auth" });
  }

  return (
    <div className="w-full">
      <div className={`m-input-shell ${compact ? "" : "sm:py-1.5"} flex-col sm:flex-row`}>
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 py-2 sm:items-center sm:py-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={compact ? 2 : 2}
            maxLength={800}
            placeholder="florarie-cotroceni.ro · sau scrie două fraze despre afacere"
            className="max-h-28 w-full resize-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35 sm:text-base"
          />
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-white/45 hover:text-white/80">
            <ImagePlus className="h-4 w-4" />
            Poze
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
          </label>
          <button type="button" onClick={preview} className="m-pill m-pill-solid gap-1.5 text-[14px]">
            Generează <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/45">
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--m-accent)]" /> Schiță gratuită</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--m-accent)]" /> Fără card</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--m-accent)]" /> Anulezi oricând</span>
        {countLabel && <span className="text-white/55">{countLabel}</span>}
      </div>
      {error && <p className="mt-3 text-center text-[13px] text-red-300">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-4 flex justify-center gap-2">
          {photos.map((photo, index) => (
            <div key={photo.url} className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10">
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => removePhoto(index)} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70" aria-label="Elimină">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {board && (
        <div className="m-panel mt-8 grid gap-6 p-5 sm:grid-cols-[160px_1fr] sm:p-7">
          <div className="m-float flex aspect-[9/16] flex-col rounded-2xl bg-gradient-to-b from-[oklch(0.35_0.12_250)] to-[oklch(0.18_0.04_285)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Reel · 15s</p>
            <p className="mt-5 text-xl leading-tight text-white">{board.hook}</p>
            <p className="mt-auto text-[11px] text-white/45">Schiță live</p>
          </div>
          <div>
            <ol className="space-y-3">
              {board.beats.map((beat) => (
                <li key={beat.time} className="grid grid-cols-[56px_1fr] gap-3 text-[14px]">
                  <span className="text-[12px] text-[var(--m-accent)]">{beat.time}</span>
                  <span className="text-white/75"><strong className="font-medium text-white">{beat.title}. </strong>{beat.body}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[14px] text-white/50">{board.caption}</p>
            <button type="button" onClick={keep} className="m-pill m-pill-solid mt-6 text-sm">
              Păstrează schița · creează cont
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
