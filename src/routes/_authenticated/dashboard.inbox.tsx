import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Check, EyeOff, Facebook, Hand, Instagram, Loader2, MessageCircle, RefreshCw, Send, X, ArrowLeft, Inbox as InboxIcon } from "lucide-react";
import { PageHeader, Panel, SkeletonBlock } from "@/components/ui-kit";
import { getInboxStatus, listConversations, getConversation, sendReply, rejectDraft, regenerateDraft, setConversationState, hideCommentFn } from "@/lib/inbox.functions";

export const Route = createFileRoute("/_authenticated/dashboard/inbox")({
  head: () => ({ meta: [{ title: "Inbox AI — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: InboxPage,
});

const FILTERS = [
  { v: "all", l: "Active" }, { v: "unread", l: "Necitite" }, { v: "pending", l: "Așteaptă răspuns" },
  { v: "human", l: "Preluate de om" }, { v: "comments", l: "Comentarii" }, { v: "closed", l: "Închise" },
] as const;
const CHANNEL: Record<string, { l: string; icon: typeof Facebook }> = {
  messenger: { l: "Messenger", icon: Facebook }, instagram: { l: "Instagram Direct", icon: Instagram },
  fb_comment: { l: "Comentariu Facebook", icon: MessageCircle }, ig_comment: { l: "Comentariu Instagram", icon: MessageCircle },
};
const STATUS: Record<string, string> = { open: "Deschisă", pending: "Așteaptă răspuns", human: "Preluată de om", closed: "Închisă" };
const SCOPE_LABELS: Record<string, string> = {
  pages_messaging: "mesaje Facebook", pages_manage_metadata: "abonare la notificări", instagram_manage_messages: "mesaje Instagram",
  pages_manage_engagement: "răspuns la comentarii Facebook", instagram_manage_comments: "comentarii Instagram",
};
const time = (d: string) => new Date(d).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function InboxPage() {
  const statusFn = useServerFn(getInboxStatus);
  const listFn = useServerFn(listConversations);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["v"]>("all");
  const [list, setList] = useState<any[] | null>(null);
  const [status, setStatus] = useState<{ connected: boolean; checked: boolean; missingScopes: string[] } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() { try { setList(await listFn({ data: { filter } })); } catch (e: any) { toast.error(e?.message); setList([]); } }
  useEffect(() => { statusFn().then(setStatus).catch(() => {}); }, []);
  useEffect(() => { setList(null); load(); }, [filter]);
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [filter]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader title="Inbox AI" description="Mesajele și comentariile din Facebook și Instagram. AI-ul pregătește răspunsuri, iar tu decizi ce pleacă."
        actions={<Link to="/dashboard/agent" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary"><Bot className="h-4 w-4" /> Agent AI</Link>} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${filter === f.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}>{f.l}</button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className={`${openId ? "hidden lg:block" : ""}`}>
          <Panel className="p-0 overflow-hidden">
            {list === null ? <div className="p-4 space-y-2"><SkeletonBlock className="h-14" /><SkeletonBlock className="h-14" /></div>
              : list.length === 0 ? <EmptyInbox status={status} filter={filter} />
              : <ul className="divide-y divide-border">{list.map(c => {
                  const Ch = CHANNEL[c.channel]?.icon ?? MessageCircle;
                  return (
                    <li key={c.id}><button onClick={() => setOpenId(c.id)} className={`w-full text-left p-3 hover:bg-secondary/60 ${openId === c.id ? "bg-secondary" : ""}`}>
                      <div className="flex items-center gap-2 text-sm">
                        <Ch className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className={`truncate ${c.unread ? "font-semibold" : ""}`}>{c.customer_name || "Client"}</span>
                        {c.unread > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</span>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview}</div>
                      <div className="mt-1 flex gap-2 text-[11px] text-muted-foreground"><span>{STATUS[c.status]}</span><span>· {time(c.last_message_at)}</span></div>
                    </button></li>
                  );
                })}</ul>}
          </Panel>
        </div>
        <div className={`${openId ? "" : "hidden lg:block"}`}>
          {openId ? <Thread id={openId} onBack={() => setOpenId(null)} onChanged={load} />
            : <Panel><p className="py-16 text-center text-sm text-muted-foreground">Alege o conversație din listă.</p></Panel>}
        </div>
      </div>
    </div>
  );
}

function EmptyInbox({ status, filter }: { status: { connected: boolean; checked: boolean; missingScopes: string[] } | null; filter: string }) {
  let msg = "Nu ai conversații în această categorie.";
  let action: React.ReactNode = null;
  if (filter === "all" && status) {
    if (!status.connected) { msg = "Nu ai nicio pagină Facebook/Instagram conectată, așa că nu putem primi mesaje."; action = <Link to="/dashboard/integrari" className="text-primary font-medium">Conectează pagina</Link>; }
    else if (!status.checked) { msg = "Nu am verificat încă permisiunile paginii. Verifică starea conexiunii din Integrări."; action = <Link to="/dashboard/integrari" className="text-primary font-medium">Deschide Integrări</Link>; }
    else if (status.missingScopes.length) { msg = `Lipsesc permisiunile Meta pentru: ${status.missingScopes.map(s => SCOPE_LABELS[s] ?? s).join(", ")}. Reconectează pagina și acceptă-le (necesită aprobare Meta pentru clienți).`; action = <Link to="/dashboard/integrari" className="text-primary font-medium">Reconectează</Link>; }
    else msg = "Nu a venit niciun mesaj sau comentariu încă. Apar aici imediat ce un client îți scrie.";
  }
  return (
    <div className="p-6 text-center text-sm">
      <InboxIcon className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-muted-foreground">{msg}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function Thread({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const getFn = useServerFn(getConversation);
  const sendFn = useServerFn(sendReply);
  const rejectFn = useServerFn(rejectDraft);
  const regenFn = useServerFn(regenerateDraft);
  const stateFn = useServerFn(setConversationState);
  const hideFn = useServerFn(hideCommentFn);
  const [d, setD] = useState<any>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try { const r: any = await getFn({ data: { id } }); setD(r); setText(r.draft?.body ?? ""); }
    catch (e: any) { toast.error(e?.message); }
  }
  useEffect(() => { setD(null); load(); }, [id]);

  async function run(key: string, fn: () => Promise<any>, ok?: string) {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); await load(); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Eroare"); }
    finally { setBusy(null); }
  }

  if (!d) return <Panel><SkeletonBlock className="h-80" /></Panel>;
  const c = d.conversation;
  const isComment = c.channel === "fb_comment" || c.channel === "ig_comment";
  const Ch = CHANNEL[c.channel]?.icon ?? MessageCircle;

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="lg:hidden rounded-lg border border-border p-1.5" aria-label="Înapoi"><ArrowLeft className="h-4 w-4" /></button>
        <Ch className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0"><div className="font-semibold truncate">{c.customer_name || "Client"}</div><div className="text-xs text-muted-foreground">{CHANNEL[c.channel]?.l} · {STATUS[c.status]}</div></div>
        <div className="ml-auto flex flex-wrap gap-2">
          {c.status !== "human"
            ? <button onClick={() => run("t", () => stateFn({ data: { id, action: "takeover" } }), "Ai preluat conversația. AI-ul nu mai propune răspunsuri aici.")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"><Hand className="h-3.5 w-3.5" /> Preiau eu</button>
            : <button onClick={() => run("r", () => stateFn({ data: { id, action: "release" } }))} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"><Bot className="h-3.5 w-3.5" /> Repornește AI</button>}
          {isComment && <button onClick={() => window.confirm("Ascunzi comentariul pe pagină?") && run("h", () => hideFn({ data: { conversationId: id } }), "Comentariu ascuns.")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"><EyeOff className="h-3.5 w-3.5" /> Ascunde</button>}
          {c.status !== "closed"
            ? <button onClick={() => run("c", () => stateFn({ data: { id, action: "close" } }), isComment ? "Marcat ca rezolvat." : "Conversație închisă.")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"><Check className="h-3.5 w-3.5" /> {isComment ? "Rezolvat" : "Închide"}</button>
            : <button onClick={() => run("o", () => stateFn({ data: { id, action: "reopen" } }))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary">Redeschide</button>}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-2 rounded-xl bg-secondary/40 p-3">
        {d.messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : ""}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.direction === "out" ? "bg-primary text-primary-foreground" : "bg-card border border-border"} ${m.hidden ? "opacity-50" : ""}`}>
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`mt-1 text-[10px] ${m.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{time(m.sent_at)}{m.hidden && " · ascuns"}</div>
            </div>
          </div>
        ))}
      </div>

      {d.draft && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium"><Bot className="h-4 w-4 text-primary" /> Răspuns propus de AI
            <span className="ml-auto text-xs text-muted-foreground">încredere {Math.round(Number(d.draft.confidence ?? 0) * 100)}%</span></div>
          {d.draft.handoff_suggested && <p className="rounded-lg bg-warning/15 px-2 py-1 text-xs">AI-ul recomandă să răspundă un om{d.draft.reason ? `: ${d.draft.reason}` : "."}</p>}
          {(d.draft.sources ?? []).length > 0
            ? <div className="flex flex-wrap gap-1.5">{d.draft.sources.map((s: any) => <span key={s.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs" title={s.text}>{s.type}: {s.title}</span>)}</div>
            : <p className="text-xs text-muted-foreground">Fără surse din Brand Brain.</p>}
        </div>
      )}

      {!d.windowOpen && !isComment && <p className="text-xs text-warning">Au trecut peste 24 de ore de la ultimul mesaj al clientului, așa că Meta nu mai permite răspunsul din aplicație.</p>}
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Scrie răspunsul…"
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <div className="flex flex-wrap gap-2">
        <button disabled={!!busy || !text.trim() || (!d.windowOpen && !isComment)} onClick={() => run("s", () => sendFn({ data: { conversationId: id, text, draftId: d.draft?.id } }), "Răspuns trimis.")}
          className="inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy === "s" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {d.draft && text === d.draft.body ? "Aprobă și trimite" : "Trimite"}</button>
        {d.draft && <button disabled={!!busy} onClick={() => run("x", () => rejectFn({ data: { id: d.draft.id } }))} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary"><X className="h-4 w-4" /> Respinge propunerea</button>}
        <button disabled={!!busy} onClick={() => run("g", () => regenFn({ data: { conversationId: id } }), "Propunere nouă gata.")} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary">
          {busy === "g" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Propune alt răspuns</button>
      </div>
    </Panel>
  );
}
