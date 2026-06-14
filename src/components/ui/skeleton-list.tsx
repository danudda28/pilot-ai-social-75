export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass rounded-xl p-4 animate-pulse ${className}`}>
      <div className="h-4 w-1/3 bg-muted/40 rounded mb-3" />
      <div className="h-3 w-2/3 bg-muted/30 rounded mb-2" />
      <div className="h-3 w-1/2 bg-muted/30 rounded" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      {Icon && (
        <div className="mx-auto h-14 w-14 rounded-2xl gradient-bg grid place-items-center mb-4 opacity-90">
          <Icon className="h-6 w-6 text-white" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
