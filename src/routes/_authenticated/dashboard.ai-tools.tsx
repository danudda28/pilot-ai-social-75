import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { suggestHashtags, suggestBestTimes } from "@/lib/ai-polish.functions";
import { Hash, Clock, Loader2, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard/ai-tools")({
  head: () => ({ meta: [{ title: "Asistent AI — AdPilot" }] }),
  component: AiToolsPage,
});

type HashRes = { hashtags: Array<{ tag: string; reach: string; reason: string }> };
type TimesRes = { slots: Array<{ day: string; hour: string; platform: string; why: string }>; summary: string };

function AiToolsPage() {
  const sugHash = useServerFn(suggestHashtags);
  const sugTimes = useServerFn(suggestBestTimes);

  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<"instagram"|"facebook"|"both">("both");
  const [hashLoading, setHashLoading] = useState(false);
  const [hashRes, setHashRes] = useState<HashRes|null>(null);

  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState<"awareness"|"engagement"|"conversie"|"trafic">("engagement");
  const [timesLoading, setTimesLoading] = useState(false);
  const [timesRes, setTimesRes] = useState<TimesRes|null>(null);

  async function runHashtags() {
    if (!topic.trim()) return toast.error("Introdu o temă.");
    setHashLoading(true); setHashRes(null);
    try {
      const r = (await sugHash({ data: { topic, platform, language: "ro", count: 15 } })) as HashRes;
      setHashRes(r);
    } catch (e) { toast.error((e as Error).message); }
    finally { setHashLoading(false); }
  }

  async function runTimes() {
    if (!industry.trim()) return toast.error("Introdu industria.");
    setTimesLoading(true); setTimesRes(null);
    try {
      const r = (await sugTimes({ data: { industry, platform, audience: audience || undefined, goal } })) as TimesRes;
      setTimesRes(r);
    } catch (e) { toast.error((e as Error).message); }
    finally { setTimesLoading(false); }
  }

  function copyAll() {
    if (!hashRes) return;
    navigator.clipboard.writeText(hashRes.hashtags.map(h => h.tag).join(" "));
    toast.success("Hashtaguri copiate.");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" /> Asistent AI
        </h1>
        <p className="text-muted-foreground mt-1">Sugestii inteligente de hashtaguri și ore optime de postare.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass-strong rounded-xl p-5 space-y-4">
          <h2 className="font-display font-bold flex items-center gap-2"><Hash className="h-5 w-5 text-primary" /> Hashtaguri</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tema postării</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ex: cafenea de specialitate în Cluj" />
            </div>
            <div>
              <label className="text-sm font-medium">Platformă</label>
              <div className="flex gap-2 mt-1">
                {(["both","instagram","facebook"] as const).map(p => (
                  <Button key={p} size="sm" variant={platform === p ? "default" : "outline"} onClick={() => setPlatform(p)}>
                    {p === "both" ? "Ambele" : p}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={runHashtags} disabled={hashLoading} className="w-full">
              {hashLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generează hashtaguri
            </Button>
          </div>

          {hashRes && (
            <div className="space-y-3 pt-3 border-t border-border/40">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={copyAll}><Copy className="h-3 w-3 mr-1" /> Copiază tot</Button>
              </div>
              <ul className="space-y-2">
                {hashRes.hashtags.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant={h.reach === "nisa" ? "default" : h.reach === "medie" ? "secondary" : "outline"} className="shrink-0">
                      {h.reach}
                    </Badge>
                    <div className="flex-1">
                      <button className="font-mono text-primary hover:underline" onClick={() => { navigator.clipboard.writeText(h.tag); toast.success("Copiat"); }}>
                        {h.tag}
                      </button>
                      <p className="text-xs text-muted-foreground">{h.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="glass-strong rounded-xl p-5 space-y-4">
          <h2 className="font-display font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Ore optime de postare</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Industrie / nișă</label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="ex: restaurant, modă, fitness" />
            </div>
            <div>
              <label className="text-sm font-medium">Audiență (opțional)</label>
              <Textarea value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="ex: femei 25-40 ani, urban, interesate de wellness" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Obiectiv</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {(["engagement","awareness","conversie","trafic"] as const).map(g => (
                  <Button key={g} size="sm" variant={goal === g ? "default" : "outline"} onClick={() => setGoal(g)}>{g}</Button>
                ))}
              </div>
            </div>
            <Button onClick={runTimes} disabled={timesLoading} className="w-full">
              {timesLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Recomandă ore
            </Button>
          </div>

          {timesRes && (
            <div className="space-y-3 pt-3 border-t border-border/40">
              <p className="text-sm text-muted-foreground italic">{timesRes.summary}</p>
              <ul className="space-y-2">
                {timesRes.slots.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm border border-border/40 rounded-lg p-2">
                    <div className="text-center shrink-0 w-16">
                      <div className="font-bold text-primary">{s.hour}</div>
                      <div className="text-xs text-muted-foreground capitalize">{s.day}</div>
                    </div>
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-1">{s.platform}</Badge>
                      <p className="text-xs text-muted-foreground">{s.why}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
