import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileQuestion } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { materialService } from "@/services";
import { kindMeta } from "@/components/faculty/MaterialRow";

export const Route = createFileRoute("/student/materials/$id")({
  head: () => ({
    meta: [
      { title: "Lesson — TeachAI" },
      { name: "description", content: "Study a lesson published to your classroom." },
      { property: "og:title", content: "Lesson — TeachAI" },
      { property: "og:description", content: "Read, watch and download your lesson material." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentMaterialDetail,
});

function StudentMaterialDetail() {
  const { id } = Route.useParams();
  const material = useQuery({
    queryKey: ["material", id],
    queryFn: () => materialService.detail(id),
  });

  if (material.isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  if (!material.data) {
    return (
      <>
        <PageHeader
          title="Lesson"
          crumbs={[
            { label: "Student", to: "/student" },
            { label: "Lessons", to: "/student/materials" },
            { label: "Lesson" },
          ]}
        />
        <EmptyState
          icon={FileQuestion}
          title="This lesson isn't available"
          description="It may have been unpublished, or you don't have access to the classroom it belongs to."
          secondary={
            <Button variant="outline" asChild>
              <Link to="/student/materials">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to lessons
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const m = material.data;
  const meta = kindMeta[m.kind];

  return (
    <>
      <PageHeader
        title={m.title}
        description={`${meta.label}${m.durationMinutes ? ` · ${m.durationMinutes} min` : ""}`}
        crumbs={[
          { label: "Student", to: "/student" },
          { label: "Lessons", to: "/student/materials" },
          { label: m.title },
        ]}
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        }
      />

      <div className="panel p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
            <meta.icon className="h-4.5 w-4.5" />
          </span>
          <Badge variant="secondary">{meta.label}</Badge>
        </div>
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 text-center text-sm text-muted-foreground">
          The lesson content will be shown here once it is delivered to your device.
        </div>
      </div>
    </>
  );
}
