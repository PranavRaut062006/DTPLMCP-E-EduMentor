import { Link } from "@tanstack/react-router";
import { Copy, Library, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Classroom } from "@/services/types";

export function ClassroomCard({
  classroom,
  onDelete,
}: {
  classroom: Classroom;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="panel group relative flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
            {classroom.subject}
          </Badge>
          <h3 className="font-display text-base font-semibold leading-snug text-foreground">
            {classroom.name}
          </h3>
        </div>
        {onDelete ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete classroom"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(classroom.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {classroom.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{classroom.description}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {classroom.studentCount} students
        </span>
        <span className="flex items-center gap-1.5">
          <Library className="h-3.5 w-3.5" /> {classroom.materialCount} materials
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(classroom.classCode);
            toast.success("Class code copied");
          }}
          className="flex items-center gap-1.5 rounded-lg bg-elevated px-2 py-1 font-mono text-xs text-primary"
        >
          {classroom.classCode}
          <Copy className="h-3 w-3" />
        </button>
        <Link
          to="/faculty/classrooms/$id"
          params={{ id: classroom.id }}
          className="text-xs font-medium text-primary hover:underline"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
