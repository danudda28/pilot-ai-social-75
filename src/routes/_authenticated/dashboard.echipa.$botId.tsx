import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Lock, Send, Trash2 } from "lucide-react";
import { getBot, botAllowed } from "@/lib/ai-team";
import { BOT_IMAGES } from "@/lib/bot-images";
import { chatWithBot, getTeamAccess } from "@/lib/ai-team.functions";

export const Route = createFileRoute("/_authenticated/dashboard/echipa/$botId")({
  loader: ({ params }) => { const b = getBot(params.botId); if (!b) throw notFound(); return { botId: b.id }; },
  head: ({ params }) => ({ meta: [{ title: `${getBot(params.botId)?.name ?? "Robot"} — Echipa AI` }, { name: "robots", content: "noindex" }] }),
  component: BotChat,
});

type Msg = { role: "user" | "assistant"; content: string };

function BotChat() {
  const { botId } = Route.useLoaderData();
  const bot = getBot(botId)!;
  const chatFn = useServerFn(chatWithBot);
  const accessFn = useServerFn(getTeamAccess);
  const key = `team-chat-${bot.id}`;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setMessages(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { setMessages([]); }
    accessFn().then(r => setPlan(r.plan)).catch(() => setPlan("free"));
  }, [key]);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(messages.slice(-40))); endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const locked = plan !== null && !botAllowed(plan, bot.id);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy || locked) return;
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const r = await chatFn({ data: { botId: bot.id, messages: next.slice(-20) } });
      setMessages([...next, { role: "assistant", content: r.reply }]);
    } catch (e: any) { toast.error(e?.message ?? "Eroare"); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <Link to="/dashboard/echipa" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Echipa</Link>
        <div className={`rounded-2xl border border-border bg-gradient-to-br ${bot.color} p-4 text-center`}>
          <img src={BOT_IMAGES[bot.id]} alt={bot.name} width={816} height={816} className="mx-auto h-36 w-36 object-contain" />
          <div className="mt-2 text-xl font-bold">{bot.name}</div>
          <div className="text-sm text-primary font-medium">{bot.role}</div>
          <p className="mt-1 text-xs text-muted-foreground">{bot.tagline}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold">Șabloane rapide</div>
          <div className="mt-2 space-y-2">
            {bot.templates.map(t => (
              <button key={t.title} disabled={busy || locked} onClick={() => send(t.prompt)}
                className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50">{t.title}</button>
            ))}
          </div>
        </div>
        {bot.actions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold">Fă direct în aplicație</div>
            <div className="mt-2 flex flex-col gap-2">
              {bot.actions.map(a => <Link key={a.to} to={a.to} className="rounded-xl bg-secondary px-3 py-2 text-sm hover:bg-secondary/70">{a.label} →</Link>)}
            </div>
          </div>
        )}
      </aside>

      <section className="flex min-h-[70vh] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="font-semibold">Discuție cu {bot.name}</div>
          {messages.length > 0 && <button onClick={() => setMessages([])} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /> Discuție nouă</button>}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !locked && (
            <div className="py-10 text-center text-sm text-muted-foreground">Salut! Sunt {bot.name}. Alege un șablon din stânga sau scrie-mi ce ai nevoie.</div>
          )}
          {locked && (
            <div className="py-10 text-center">
              <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm">{bot.name} este disponibil din planul <b>Pro</b>.</p>
              <Link to="/preturi" className="mt-3 inline-block rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-primary-foreground">Vezi abonamentele</Link>
            </div>
          )}
          {messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
          ) : (
            <div key={i} className="flex gap-3">
              <img src={BOT_IMAGES[bot.id]} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full bg-secondary object-contain" />
              <div className="min-w-0 flex-1">
                <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_h2]:font-semibold [&_h3]:font-semibold"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                <button onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copiat."); }} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /> Copiază</button>
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {bot.name} scrie…</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-border p-3">
          <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} disabled={locked}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={`Scrie-i lui ${bot.name}…`} className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={busy || !input.trim() || locked} aria-label="Trimite"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-bg text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </form>
      </section>
    </div>
  );
}
