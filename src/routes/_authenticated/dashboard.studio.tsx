import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Check, Facebook, ImagePlus, Instagram, Loader2, Paperclip, Send, Sparkles, X,
} from "lucide-react";
import {
  estimateStudioJob,
  publishStudioSelection,
  runStudioCreate,
  runStudioOmniClip,
  selectStudioAsset,
  uploadStudioReference,
  uploadStudioVideo,
  type StudioCandidate,
} from "@/lib/studio.functions";
import { blobToDataUrl, burnSubtitles, canBurnSubtitles } from "@/lib/burn-subtitles";
import { getConnectedAccounts } from "@/lib/publishing.functions";
import { loadStudioHistory, resetStudioHistory, useStudioHistory } from "@/lib/studio-history";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Social Spark" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});

type Target = {
  target_id: string;
  platform: "facebook" | "instagram";
  account_name: string;
};

type Msg =
  | { id: string; role: "assistant"; kind: "text"; text: string }
  | { id: string; role: "user"; kind: "text"; text: string; refThumb?: string }
  | {
      id: string;
      role: "assistant";
      kind: "eta";
      human: string;
      steps: { id: string; label: string; sec: number }[];
      totalSec: number;
    }
  | {
      id: string;
      role: "assistant";
      kind: "batch";
      postId: string;
      copy: string;
      title: string;
      candidates: StudioCandidate[];
      reel: { hook: string; scenes: { caption: string; durationSec: number }[] } | null;
    }
  | { id: string; role: "assistant"; kind: "progress"; label: string; startedAt: number; totalSec: number };

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const WELCOME_TEXT =
  "Salut — sunt studio-ul tău. Spune-mi ce vrei să postezi: o ofertă, un produs, un reel. Poți încărca o poză de referință sau doar descrie verbal. Îți spun cât durează, îți arăt variantele, tu alegi, eu public pe Facebook și Instagram.";

function welcome(): Msg[] {
  return [{ id: uid(), role: "assistant", kind: "text", text: WELCOME_TEXT }];
}

function StudioPage() {
  const estimateFn = useServerFn(estimateStudioJob);
  const uploadFn = useServerFn(uploadStudioReference);
  const createFn = useServerFn(runStudioCreate);
  const omniFn = useServerFn(runStudioOmniClip);
  const uploadVideoFn = useServerFn(uploadStudioVideo);
  const selectFn = useServerFn(selectStudioAsset);
  const publishFn = useServerFn(publishStudioSelection);
  const accountsFn = useServerFn(getConnectedAccounts);

  const { messages, setMessages, busy, setBusy, picked, setPicked } = useStudioHistory<Msg>();
  const [input, setInput] = useState("");
  const [ref, setRef] = useState<{ path: string; signedUrl: string; fileName: string } | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const REF_KEY = "ss-studio-ref";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { path: string; signedUrl: string; fileName: string };
        if (parsed?.path && parsed?.signedUrl) setRef(parsed);
      }
    } catch {
      /* ignore */
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadStudioHistory<Msg>(data.user.id, welcome);
    });
    accountsFn()
      .then((t) => {
        const list = t as Target[];
        setTargets(list);
        setSelectedTargets(new Set(list.map((x) => x.target_id)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      if (ref) localStorage.setItem(REF_KEY, JSON.stringify(ref));
      else localStorage.removeItem(REF_KEY);
    } catch {
      /* ignore */
    }
  }, [ref]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function onFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Încarcă o imagine PNG, JPG sau WEBP.");
      return;
    }
    if (file.size > 6_000_000) {
      toast.error("Maxim 6 MB.");
      return;
    }
    const mime = (file.type === "image/png" || file.type === "image/webp" || file.type === "image/jpeg")
      ? file.type
      : "image/jpeg";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Nu am putut citi fișierul."));
      reader.readAsDataURL(file);
    });
    try {
      const uploaded = await uploadFn({
        data: {
          dataUrl,
          mimeType: mime as "image/png" | "image/jpeg" | "image/webp",
          fileName: file.name,
        },
      }) as { path: string; signedUrl: string; fileName: string; local?: boolean };
      setRef(uploaded);
      toast.success("Poză atașată.");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload eșuat.");
    }
  }

  async function send() {
    const brief = input.trim();
    if (!brief || busy) return;
    setInput("");
    const userMsg: Msg = {
      id: uid(),
      role: "user",
      kind: "text",
      text: brief,
      refThumb: ref?.signedUrl,
    };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    try {
      const eta = await estimateFn({ data: { brief, hasReference: !!ref } });
      const etaMsg: Msg = {
        id: uid(),
        role: "assistant",
        kind: "eta",
        human: eta.human,
        steps: eta.steps,
        totalSec: eta.totalSec,
      };
      const progressMsg: Msg = {
        id: uid(),
        role: "assistant",
        kind: "progress",
        label: "Generez pozele…",
        startedAt: Date.now(),
        totalSec: eta.totalSec,
      };
      setMessages((m) => [...m, etaMsg, progressMsg]);

      const result = await createFn({
        data: {
          brief,
          kind: eta.kind,
          variants: eta.variants,
          referencePath: ref?.path,
          referenceNote: ref?.fileName,
        },
      });

      if (!result?.post?.id) {
        throw new Error(result?.reply || "Generarea nu a returnat o postare. Reîncearcă.");
      }

      const batchId = uid();
      setMessages((m) => {
        const withoutProgress = m.filter((x) => x.kind !== "progress");
        return [
          ...withoutProgress,
          {
            id: uid(),
            role: "assistant",
            kind: "text",
            text: result.reply,
          },
          {
            id: batchId,
            role: "assistant",
            kind: "batch",
            postId: result.post.id,
            copy: result.post.copy ?? "",
            title: result.post.title ?? "Postare",
            candidates: result.candidates ?? [],
            reel: result.reel
              ? {
                  hook: result.reel.hook,
                  scenes: result.reel.scenes.map((s) => ({
                    caption: s.caption,
                    durationSec: s.durationSec,
                  })),
                }
              : null,
          },
        ];
      });
      if (result.candidates?.[0]) {
        setPicked((p) => ({ ...p, [result.post.id]: result.candidates[0].path }));
      }

      // Clip Omni în al doilea pas — nu se pierde dacă request-ul e lung
      if (result.wantsOmni) {
        setBusy(false);
        const omniProgressId = uid();
        setMessages((m) => [
          ...m,
          {
            id: omniProgressId,
            role: "assistant",
            kind: "progress",
            label: "Creez clipul video…",
            startedAt: Date.now(),
            totalSec: 55,
          },
        ]);
        try {
          const omni = await omniFn({
            data: {
              postId: result.post.id,
              brief,
              hook: result.reel?.hook,
              scenes: result.reel?.scenes?.map((s) => s.caption),
              referencePath: ref?.path,
            },
          });
          setMessages((m) =>
            m
              .filter((x) => x.id !== omniProgressId)
              .map((x) => {
                if (x.id !== batchId || x.kind !== "batch") return x;
                const next = [omni.candidate, ...x.candidates.filter((c) => c.id !== "reel-omni")];
                return { ...x, candidates: next };
              }),
          );
          if (omni.candidate?.path) {
            setPicked((p) => ({ ...p, [result.post.id]: omni.candidate.path }));
          }
          if (omni.candidate?.subtitles?.length && canBurnSubtitles()) {
            const subId = uid();
            setMessages((m) => [
              ...m,
              { id: subId, role: "assistant", kind: "progress", label: "Adaug subtitrarea… lasă pagina deschisă câteva secunde", startedAt: Date.now(), totalSec: 12 },
            ]);
            try {
              const blob = await burnSubtitles(omni.candidate.signedUrl, omni.candidate.subtitles);
              if (blob) {
                const saved = await uploadVideoFn({
                  data: { postId: result.post.id, dataUrl: await blobToDataUrl(blob), mimeType: "video/mp4" },
                });
                const subtitled = { ...omni.candidate, path: saved.path, signedUrl: saved.signedUrl };
                setMessages((m) =>
                  m.map((x) =>
                    x.id === batchId && x.kind === "batch"
                      ? { ...x, candidates: x.candidates.map((c) => (c.id === "reel-omni" ? subtitled : c)) }
                      : x,
                  ),
                );
                setPicked((p) => ({ ...p, [result.post.id]: saved.path }));
              }
            } catch (subErr) {
              console.error("[studio subtitles]", subErr);
            } finally {
              setMessages((m) => m.filter((x) => x.id !== subId));
            }
          }
          if ((omni as { note?: string }).note) {
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: "assistant",
                kind: "text",
                text: (omni as { note?: string }).note!,
              },
            ]);
          }
        } catch (omniErr: any) {
          console.error("[studio video]", omniErr);
          setMessages((m) => [
            ...m.filter((x) => x.id !== omniProgressId),
            {
              id: uid(),
              role: "assistant",
              kind: "text",
              text: "Clipul video nu a putut fi creat de data asta. Pozele sunt gata și le poți folosi — încearcă din nou clipul peste câteva minute.",
            },
          ]);
        }
        return;
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m.filter((x) => x.kind !== "progress"),
        { id: uid(), role: "assistant", kind: "text", text: e?.message ?? "A apărut o eroare. Reîncearcă." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function publish(postId: string) {
    const path = picked[postId];
    if (!path) {
      toast.error("Alege o variantă.");
      return;
    }
    const profileIds = Array.from(selectedTargets);
    if (profileIds.length === 0) {
      toast.error("Selectează Facebook / Instagram.");
      return;
    }
    setBusy(true);
    try {
      await selectFn({ data: { postId, path } });
      const res = await publishFn({
        data: {
          postId,
          path,
          profileIds,
          scheduledDate: when ? new Date(when).toISOString() : undefined,
        },
      });
      if (res.mode === "scheduled") {
        toast.success(`Programat pentru ${new Date(res.when).toLocaleString("ro-RO")}`);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            kind: "text",
            text: `Am programat postarea. Apare în calendar la ${new Date(res.when).toLocaleString("ro-RO")}.`,
          },
        ]);
      } else {
        const ok = res.results.filter((r) => r.ok).length;
        const fail = res.results.filter((r) => !r.ok);
        if (ok) toast.success(`Publicat pe ${ok} cont${ok === 1 ? "" : "uri"}.`);
        fail.forEach((f) => toast.error(`${f.target}: ${f.error}`));
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            kind: "text",
            text: ok
              ? `Publicat pe ${ok} cont${ok === 1 ? "" : "uri"}. Poți porni o altă generare când vrei.`
              : "Publicarea a eșuat. Verifică Integrările Meta.",
          },
        ]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Eroare la publicare.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-5xl flex-col lg:h-[calc(100vh-2rem)]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Studio
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Conversație → generare → publicare
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ca un chat real: referință sau descriere, ETA, alegi variantele, publici pe Meta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {messages.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => resetStudioHistory(welcome())}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
          >
            Conversație nouă
          </button>
        )}
        {targets.length === 0 ? (
          <Link to="/dashboard/integrari" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
            Conectează Meta
          </Link>
        ) : (
          <div className="flex flex-wrap gap-2">
            {targets.map((t) => {
              const active = selectedTargets.has(t.target_id);
              const Icon = t.platform === "instagram" ? Instagram : Facebook;
              return (
                <button
                  key={t.target_id}
                  type="button"
                  onClick={() => {
                    const next = new Set(selectedTargets);
                    next.has(t.target_id) ? next.delete(t.target_id) : next.add(t.target_id);
                    setSelectedTargets(next);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                    active ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.account_name}
                </button>
              );
            })}
          </div>
        )}
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m) => {
            if (m.kind === "text" && m.role === "user") {
              return (
                <div key={m.id} className="ml-auto max-w-[85%] space-y-2">
                  {m.refThumb && (
                    <img src={m.refThumb} alt="" className="ml-auto h-20 w-20 rounded-xl object-cover" />
                  )}
                  <div className="whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {m.text}
                  </div>
                </div>
              );
            }
            if (m.kind === "text") {
              return (
                <div key={m.id} className="max-w-[90%] rounded-2xl bg-secondary/60 px-4 py-3 text-sm leading-relaxed">
                  {m.text}
                </div>
              );
            }
            if (m.kind === "eta") {
              return (
                <div key={m.id} className="max-w-lg rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-medium">Durată estimată: {m.human}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    {m.steps.map((s) => (
                      <li key={s.id} className="flex justify-between gap-4">
                        <span>{s.label}</span>
                        <span>~{s.sec}s</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            if (m.kind === "progress") {
              return <ProgressCard key={m.id} label={m.label} startedAt={m.startedAt} totalSec={m.totalSec} />;
            }
            if (m.kind === "batch") {
              const selected = picked[m.postId];
              return (
                <div key={m.id} className="max-w-3xl space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Text</p>
                    <p className="mt-1 font-medium">{m.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{m.copy}</p>
                  </div>
                  {m.reel && (
                    <div className="rounded-xl border border-border/70 bg-secondary/40 p-3 text-xs">
                      <p className="font-medium">Scenariu Reel · {m.reel.hook}</p>
                      <ol className="mt-2 space-y-1 text-muted-foreground">
                        {m.reel.scenes.map((s, i) => (
                          <li key={i}>{i + 1}. {s.caption} ({s.durationSec}s)</li>
                        ))}
                      </ol>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Clipul video apare aici când e gata — îl poți reda, descărca și publica.
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Alege varianta</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {m.candidates.map((c) => {
                        const on = selected === c.path;
                        const isVideo = c.kind === "reel_video";
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setPicked((p) => ({ ...p, [m.postId]: c.path }))}
                            className={`relative overflow-hidden rounded-xl border text-left ${
                              on ? "border-primary ring-2 ring-primary/30" : "border-border"
                            }`}
                          >
                            {isVideo ? (
                              <video
                                src={c.signedUrl}
                                className="aspect-[9/16] w-full object-cover bg-black"
                                controls
                                playsInline
                                muted
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <img src={c.signedUrl} alt={c.label} className="aspect-square w-full object-cover" />
                            )}
                            <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
                              <span>{c.label}</span>
                              {on && <Check className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            {isVideo && (
                              <a
                                href={c.signedUrl}
                                download="omni-reel.mp4"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                              >
                                MP4
                              </a>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-xs text-muted-foreground">
                      Programează (opțional)
                      <input
                        type="datetime-local"
                        value={when}
                        onChange={(e) => setWhen(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy || !selected}
                      onClick={() => publish(m.postId)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
                    >
                      {when ? "Programează" : "Publică acum"} pe Meta
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          {ref && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-2 py-1 text-xs">
              <img src={ref.signedUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
              <span className="max-w-[160px] truncate">{ref.fileName}</span>
              <button type="button" onClick={() => setRef(null)} aria-label="Elimină referința">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-secondary disabled:opacity-50"
              aria-label="Încarcă referință"
            >
              {ref ? <Paperclip className="h-4 w-4 text-primary" /> : <ImagePlus className="h-4 w-4" />}
            </button>
            <textarea
              rows={2}
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={ref ? "Spune ce vrei să facem cu referința…" : "Ex: Am un buchet de sezon, vreau 3 poze și un reel pentru Instagram…"}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-50"
              aria-label="Trimite"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ProgressCard({ label, startedAt, totalSec }: { label: string; startedAt: number; totalSec: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const pct = Math.min(95, Math.round((elapsed / Math.max(totalSec, 1)) * 100));
  const left = Math.max(0, Math.ceil(totalSec - elapsed));
  return (
    <div className="max-w-md rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {label}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">~{left}s rămase</p>
    </div>
  );
}
