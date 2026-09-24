import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  secondary,
}: {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
  secondary?: React.ReactNode | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actionLabel ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      {secondary ? <div className="mt-4">{secondary}</div> : null}
    </div>
  );
}
