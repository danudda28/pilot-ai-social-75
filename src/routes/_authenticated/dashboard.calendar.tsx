import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/calendar")({
  head: () => ({ meta: [{ title: "Calendar — AdPilot Social" }] }),
  component: CalendarPage,
});

type Post = { id: string; title: string | null; platform: string; status: string; scheduled_date: string | null; created_at: string };

function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("generated_posts").select("*").eq("user_id", user.id).order("scheduled_date", { ascending: true, nullsFirst: false });
      setPosts((data ?? []) as Post[]);
    })();
  }, []);

  const grouped = posts.reduce<Record<string, Post[]>>((acc, p) => {
    const d = p.scheduled_date ?? p.created_at;
    const day = new Date(d).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    acc[day] = acc[day] || []; acc[day].push(p); return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CalIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Calendar editorial</h1>
          <p className="text-muted-foreground mt-1">Vizualizare cronologică a postărilor.</p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          Calendar gol. Generează postări pentru a le vedea aici.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, ps]) => (
            <div key={day}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{day}</div>
              <div className="space-y-2">
                {ps.map(p => (
                  <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.title ?? "(fără titlu)"}</div>
                      <div className="text-xs text-muted-foreground capitalize">{p.platform} · {p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
