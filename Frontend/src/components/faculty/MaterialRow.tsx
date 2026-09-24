import { Link } from "@tanstack/react-router";
import { Clock, FileText, Mic, Notebook, Presentation, Video, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentKind, Material } from "@/services/types";

export const kindMeta: Record<ContentKind, { label: string; icon: LucideIcon }> = {
  "teaching-plan": { label: "Teaching plan", icon: Clock },
  ppt: { label: "Presentation", icon: Presentation },
  notes: { label: "Notes", icon: Notebook },
  pdf: { label: "PDF", icon: FileText },
  script: { label: "Lecture script", icon: Mic },
  video: { label: "AI video", icon: Video },
};

export function MaterialRow({
  material,
  basePath = "/faculty/materials",
}: {
  material: Material;
  basePath?: string;
}) {
  const meta = kindMeta[material.kind];
  return (
    <Link
      to={basePath === "/student/materials" ? "/student/materials/$id" : "/faculty/materials/$id"}
      params={{ id: material.id }}
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
        <meta.icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{material.title}</p>
        <p className="text-xs text-muted-foreground">
          {meta.label}
          {material.durationMinutes ? ` · ${material.durationMinutes} min` : ""}
        </p>
      </div>
      <Badge variant={material.status === "published" ? "default" : "secondary"}>
        {material.status}
      </Badge>
    </Link>
  );
}
