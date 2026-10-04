import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Copy, FlaskConical, Loader2, Webhook } from "lucide-react";
import { PageHeader, Panel, SkeletonBlock } from "@/components/ui-kit";
import { getAgentSettings, saveAgentSettings, testAgent, getWebhookSetup } from "@/lib/inbox.functions";

export const Route = createFileRoute("/_authenticated/dashboard/agent")({
  head: () => ({ meta: [{ title: "Agent AI — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: AgentPage,
});

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const DAYS = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "Sâ"];
const split = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

function AgentPage() {
  const getFn = useServerFn(getAgentSettings);
  const saveFn = useServerFn(saveAgentSettings);
  const testFn = useServerFn(testAgent);
  const hookFn = useServerFn(getWebhookSetup);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [s, setS] = useState<any>(null);
  const [topics, setTopics] = useState("");
  const [keywords, setKeywords] = useState("");
  const [intents, setIntents] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hook, setHook] = useState<{ path: string; verifyToken: string | null } | null>(null);

  useEffect(() => {
    getFn().then((r: any) => { setBrandId(r.brandId); setS(r.settings); setTopics(r.settings.forbidden_topics.join(", ")); setKeywords(r.settings.handoff_keywords.join(", ")); setIntents((r.settings.auto_send_intents ?? []).join(", ")); })
      .catch((e: any) => toast.error(e?.message));
    hookFn().then(setHook).catch(() => {});
  }, []);

  async function save() {
    if (!brandId || !s) return;
    setSaving(true);
    try {
      await saveFn({ data: { brandId, enabled: s.enabled, working_hours: s.working_hours, forbidden_topics: split(topics), handoff_keywords: split(keywords), handoff_message: s.handoff_message, auto_send: !!s.auto_send, auto_send_min_confidence: Number(s.auto_send_min_confidence ?? 0.85), auto_send_daily_limit: Number(s.auto_send_daily_limit ?? 20), auto_send_intents: split(intents) } });
      toast.success("Setările agentului au fost salvate.");
    } catch (e: any) { toast.error(e?.message); }
    finally { setSaving(false); }
  }

  async function test() {
    if (!msg.trim()) return;
    setTesting(true); setResult(null);
    try { setResult(await testFn({ data: { message: msg } })); }
    catch (e: any) { toast.error(e?.message); }
    finally { setTesting(false); }
  }

  if (!s) return <div className="max-w-4xl mx-auto"><SkeletonBlock className="h-96" /></div>;
  const wh = s.working_hours;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Agent AI" description="Cum răspunde AI-ul la mesaje și comentarii. Deocamdată doar propune răspunsuri și nu trimite nimic fără acordul tău." />

      <Panel>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Bot className="h-6 w-6 text-primary" />
            <div><div className="font-semibold">Propuneri AI în Inbox</div><div className="text-sm text-muted-foreground">Mod: doar drafturi. Trimiterea automată vine într-o etapă următoare.</div></div></div>
          <button role="switch" aria-checked={s.enabled} aria-label="Pornește sau oprește agentul" onClick={() => setS({ ...s, enabled: !s.enabled })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${s.enabled ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-background transition ${s.enabled ? "left-6" : "left-1"}`} /></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 text-sm font-medium">Program de lucru al echipei</div>
          <label className="block text-sm">De la<input type="time" className={inputCls + " mt-1"} value={wh.start} onChange={e => setS({ ...s, working_hours: { ...wh, start: e.target.value } })} /></label>
          <label className="block text-sm">Până la<input type="time" className={inputCls + " mt-1"} value={wh.end} onChange={e => setS({ ...s, working_hours: { ...wh, end: e.target.value } })} /></label>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => setS({ ...s, working_hours: { ...wh, days: wh.days.includes(i) ? wh.days.filter((x: number) => x !== i) : [...wh.days, i].sort() } })}
                className={`h-9 w-11 rounded-lg border text-sm ${wh.days.includes(i) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{d}</button>
            ))}
          </div>
          <label className="block text-sm font-medium sm:col-span-2">Subiecte la care AI-ul nu răspunde (separate prin virgulă)
            <input className={inputCls + " mt-1"} value={topics} onChange={e => setTopics(e.target.value)} /></label>
          <label className="block text-sm font-medium sm:col-span-2">Cuvinte care trimit conversația la un om (separate prin virgulă)
            <input className={inputCls + " mt-1"} value={keywords} onChange={e => setKeywords(e.target.value)} />
            <span className="text-xs font-normal text-muted-foreground">AI-ul predă oricum când clientul e nervos, cere rambursare sau vrea să vorbească cu un om.</span></label>
          <label className="block text-sm font-medium sm:col-span-2">Mesajul pentru client la predare
            <textarea rows={2} className={inputCls + " mt-1"} value={s.handoff_message} onChange={e => setS({ ...s, handoff_message: e.target.value })} /></label>
        </div>
        <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvează setările</button>
      </Panel>

      <Panel>
        <div className="flex items-center gap-2 font-semibold"><FlaskConical className="h-5 w-5 text-primary" /> Test Lab</div>
        <p className="text-sm text-muted-foreground mt-1">Scrie ca un client și vezi ce ar propune agentul. Nu se trimite nimic nicăieri.</p>
        <div className="mt-3 flex gap-2">
          <input className={inputCls} value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && test()} placeholder="ex: Bună, ce program aveți sâmbătă?" />
          <button onClick={test} disabled={testing || !msg.trim()} className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {testing && <Loader2 className="h-4 w-4 animate-spin" />} Testează</button>
        </div>
        {result && (
          <div className="mt-4 space-y-2 rounded-xl border border-border p-4 text-sm">
            <div className="whitespace-pre-wrap">{result.reply || <span className="text-muted-foreground">(fără răspuns)</span>}</div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Încredere: {Math.round(result.confidence * 100)}%</span>
              <span className={result.handoff ? "text-warning font-medium" : ""}>{result.handoff ? `Predă unui om${result.reason ? ` — ${result.reason}` : ""}` : "Poate răspunde singur"}</span>
            </div>
            {result.sources.length > 0
              ? <div className="flex flex-wrap gap-1.5">{result.sources.map((x: any) => <span key={x.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs" title={x.text}>{x.type}: {x.title}</span>)}</div>
              : <p className="text-xs text-muted-foreground">N-a folosit nicio sursă. Completează Brand Brain (FAQ, servicii, program) pentru răspunsuri mai bune.</p>}
          </div>
        )}
      </Panel>

      {hook && (
        <Panel>
          <div className="flex items-center gap-2 font-semibold"><Webhook className="h-5 w-5 text-primary" /> Configurare Meta Webhooks (doar admin)</div>
          <p className="text-sm text-muted-foreground mt-1">În Meta Developer → Webhooks, abonează obiectele <b>Page</b> (câmpurile messages, feed) și <b>Instagram</b> (messages, comments) cu datele de mai jos.</p>
          <CopyRow label="Callback URL" value={`https://socialspark.ro${hook.path}`} />
          <CopyRow label="Verify token" value={hook.verifyToken ?? "—"} />
        </Panel>
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex gap-2"><code className="flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-xs">{value}</code>
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiat."); }} aria-label={`Copiază ${label}`} className="rounded-lg border border-border px-2"><Copy className="h-4 w-4" /></button></div>
    </div>
  );
}
