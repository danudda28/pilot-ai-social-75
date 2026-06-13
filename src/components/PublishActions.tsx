import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getConnectedAccounts, publishPost, schedulePost } from "@/lib/publishing.functions";
import { toast } from "sonner";
import { Send, CalendarClock, Loader2, Instagram, Facebook, Plug } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Target = {
  target_id: string;
  platform: "facebook" | "instagram";
  account_name: string;
  connection_id: string;
};

export function PublishActions({ postId, defaultPlatform }: { postId: string; defaultPlatform?: string }) {
  const listAccounts = useServerFn(getConnectedAccounts);
  const publish = useServerFn(publishPost);
  const schedule = useServerFn(schedulePost);

  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState<string>("");
  const [busy, setBusy] = useState<null | "publish" | "schedule">(null);

  useEffect(() => {
    (async () => {
      try {
        const t = (await listAccounts()) as Target[];
        setTargets(t);
        const match = t.filter(x => defaultPlatform === "both" || !defaultPlatform || x.platform === defaultPlatform);
        setSelected(new Set(match.map(x => x.target_id)));
      } catch {}
    })();
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const profileIds = Array.from(selected);

  async function onPublish() {
    if (profileIds.length === 0) { toast.error("Selectează cel puțin un cont."); return; }
    setBusy("publish");
    try {
      const res = await publish({ data: { postId, profileIds } }) as { results: { ok: boolean; target: string; error?: string }[] };
      const ok = res.results.filter(r => r.ok).length;
      const fail = res.results.filter(r => !r.ok);
      if (ok > 0) toast.success(`Publicat pe ${ok} cont${ok === 1 ? "" : "uri"}.`);
      fail.forEach(f => toast.error(`Eșec ${f.target}: ${f.error}`));
    } catch (e: any) { toast.error(e?.message ?? "Eroare la publicare."); }
    finally { setBusy(null); }
  }

  async function onSchedule() {
    if (profileIds.length === 0) { toast.error("Selectează cel puțin un cont."); return; }
    if (!when) { toast.error("Alege data și ora."); return; }
    const date = new Date(when);
    if (isNaN(date.getTime()) || date.getTime() < Date.now()) { toast.error("Data trebuie să fie în viitor."); return; }
    setBusy("schedule");
    try {
      await schedule({ data: { postId, profileIds, scheduledDate: date.toISOString() } });
      toast.success(`Programat pentru ${date.toLocaleString("ro-RO")}`);
    } catch (e: any) { toast.error(e?.message ?? "Eroare la programare."); }
    finally { setBusy(null); }
  }

  if (targets.length === 0) {
    return (
      <div className="glass rounded-xl p-4 text-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Plug className="h-4 w-4" />
          Nu ai conturi Meta conectate.
        </div>
        <Link to="/dashboard/integrari" className="text-primary text-xs font-semibold hover:underline">
          Conectează →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Publică pe</div>
        <div className="flex flex-wrap gap-2">
          {targets.map(t => {
            const active = selected.has(t.target_id);
            const Icon = t.platform === "instagram" ? Instagram : Facebook;
            return (
              <button
                key={t.target_id}
                type="button"
                onClick={() => toggle(t.target_id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs border transition-colors ${
                  active ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:border-border"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${t.platform === "instagram" ? "text-pink-400" : "text-blue-400"}`} />
                {t.account_name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Programează pentru</label>
          <input
            type="datetime-local"
            value={when}
            onChange={e => setWhen(e.target.value)}
            className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={onSchedule}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg glass-strong px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "schedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          Programează
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg gradient-bg glow px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Publică acum
        </button>
      </div>
    </div>
  );
}
