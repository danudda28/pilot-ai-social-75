import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { BOTS, botAllowed } from "@/lib/ai-team";
import { BOT_IMAGES } from "@/lib/bot-images";
import { getTeamAccess } from "@/lib/ai-team.functions";

export const Route = createFileRoute("/_authenticated/dashboard/echipa/")({
  head: () => ({ meta: [{ title: "Echipa ta AI — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: TeamPage,
});

function TeamPage() {
  const accessFn = useServerFn(getTeamAccess);
  const [plan, setPlan] = useState<string | null>(null);
  useEffect(() => { accessFn().then(r => setPlan(r.plan)).catch(() => setPlan("free")); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Echipa ta AI" description="8 specialiști care cunosc afacerea ta din Brand Brain. Alege un coleg, pornește un șablon sau scrie-i direct." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BOTS.map(b => {
          const locked = plan !== null && !botAllowed(plan, b.id);
          return (
            <Link key={b.id} to="/dashboard/echipa/$botId" params={{ botId: b.id }}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${locked ? "opacity-70" : ""}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${b.color}`} aria-hidden />
              <div className="relative">
                <img src={BOT_IMAGES[b.id]} alt={`${b.name}, ${b.role}`} width={816} height={816} loading="lazy"
                  className="mx-auto h-40 w-40 object-contain transition group-hover:scale-105" />
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg font-bold">{b.name}</span>
                  {locked && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"><Lock className="h-3 w-3" /> Pro</span>}
                </div>
                <div className="text-sm font-medium text-primary">{b.role}</div>
                <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {b.skills.slice(0, 3).map(s => <span key={s} className="rounded-full bg-background/70 px-2 py-0.5 text-xs">{s}</span>)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
