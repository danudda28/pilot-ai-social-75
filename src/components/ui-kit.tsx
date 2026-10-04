import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("surface p-5", className)}>{children}</div>;
}

export function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", state === "error" ? "text-destructive" : "text-muted-foreground")}>
      {state === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Se salvează…</>}
      {state === "saved" && <><Check className="h-3 w-3 text-success" /> Salvat</>}
      {state === "error" && <>Nesalvat</>}
    </span>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full gradient-bg transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ComingSoon({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Panel className="max-w-2xl">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">În curând</span>
        <p className="mt-3 text-sm text-muted-foreground">Această secțiune nu este încă activă. Nu afișăm date demonstrative. Când o lansăm, vei putea:</p>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map(i => <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{i}</li>)}
        </ul>
      </Panel>
    </div>
  );
}
