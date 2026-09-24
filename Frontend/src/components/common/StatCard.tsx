import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value?: number | string | null | undefined;
  hint?: string | undefined;
  loading?: boolean | undefined;
}) {
  return (
    <div className="panel group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold text-foreground">
              {value ?? 0}
            </p>
          )}
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated text-primary transition-colors group-hover:border-primary/40">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
