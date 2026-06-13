import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAnalytics } from "@/lib/analytics.functions";
import { BarChart3, Heart, MessageCircle, Share2, Eye, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analitice — Social Spark" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(getMyAnalytics);
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetchAnalytics().then(setD).catch(() => {}); }, []);

  if (!d) return <div className="text-center py-20 text-muted-foreground">Se încarcă...</div>;

  const max = Math.max(...d.timeline.map((t: any) => t.count), 1);
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Analitice</h1>
          <p className="text-muted-foreground mt-1">Vizualizează performanța postărilor tale.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Eye} label="Reach total" value={d.totals.totalReach.toLocaleString("ro-RO")} />
        <Stat icon={Heart} label="Like-uri" value={d.totals.totalLikes.toLocaleString("ro-RO")} />
        <Stat icon={MessageCircle} label="Comentarii" value={d.totals.totalComments.toLocaleString("ro-RO")} />
        <Stat icon={Share2} label="Share-uri" value={d.totals.totalShares.toLocaleString("ro-RO")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Rata medie de engagement</div>
          <div className="font-display text-4xl font-bold gradient-text flex items-center gap-2">
            {d.totals.avgEng}% <TrendingUp className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{d.totals.published} postări publicate din {d.totals.all} total</p>
        </div>
        <div className="glass-strong rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Pe platforme</div>
          {Object.entries(d.byPlatform).map(([k, v]: any) => (
            <div key={k} className="flex items-center justify-between text-sm py-1">
              <span className="capitalize">{k}</span><span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Activitate ultimele 14 zile</div>
        <div className="flex items-end gap-1 h-32">
          {d.timeline.map((t: any) => (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-gradient-to-t from-primary to-accent rounded-t" style={{ height: `${(t.count / max) * 100}%`, minHeight: t.count > 0 ? 4 : 0 }} />
              <span className="text-[9px] text-muted-foreground">{t.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {d.totals.totalReach === 0 && (
        <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
          💡 Datele de engagement (like-uri, reach) se sincronizează automat din Meta Graph API după ce conectezi pagina și ai postări publicate. Job-ul rulează zilnic.
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
