import { cn } from "@/lib/utils";
import { STATUS_LABEL, type ContentStatus } from "@/lib/types";

const STYLES: Record<ContentStatus, string> = {
  NOT_GENERATED: "bg-muted text-muted-foreground border-border",
  DRAFT: "bg-warning/12 text-warning border-warning/30",
  UNDER_REVIEW: "bg-info/12 text-info border-info/30",
  APPROVED: "bg-success/12 text-success border-success/30",
  PUBLISHED: "bg-primary/10 text-primary border-primary/25",
};

export function StatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
        STYLES[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
