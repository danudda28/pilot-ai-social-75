import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications.functions";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function NotificationsBell() {
  const list = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);

  async function refresh() {
    try {
      const res = await list();
      setItems((res as any).notifications);
    } catch {}
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, []);

  const unread = items.filter(n => !n.read_at).length;

  async function handleClick(n: Notif) {
    if (!n.read_at) {
      await markRead({ data: { id: n.id } });
      refresh();
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative rounded-lg p-2 hover:bg-secondary" aria-label="Notificări">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-strong rounded-2xl shadow-xl z-50">
            <div className="p-3 border-b border-border/40 flex items-center justify-between">
              <span className="text-sm font-semibold">Notificări</span>
              {unread > 0 && (
                <button onClick={async () => { await markAll(); refresh(); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" /> Marchează toate
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nicio notificare.</div>
            ) : (
              <ul>
                {items.map(n => {
                  const inner = (
                    <div className={`p-3 border-b border-border/30 hover:bg-secondary/40 cursor-pointer ${!n.read_at ? "bg-primary/5" : ""}`}>
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("ro-RO")}</div>
                    </div>
                  );
                  return (
                    <li key={n.id} onClick={() => handleClick(n)}>
                      {n.link ? <Link to={n.link as any} onClick={() => setOpen(false)}>{inner}</Link> : inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
