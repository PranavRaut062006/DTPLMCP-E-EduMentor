import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Layers, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { classroomService, materialService, statsService } from "@/services";
import { MaterialRow } from "@/components/faculty/MaterialRow";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student dashboard — TeachAI" },
      {
        name: "description",
        content: "Your enrolled classrooms and the latest lessons your teachers published.",
      },
      { property: "og:title", content: "Student dashboard — TeachAI" },
      { property: "og:description", content: "Follow your classes and study published lessons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const stats = useQuery({ queryKey: ["stats", "student"], queryFn: statsService.student });
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: classroomService.list });
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => materialService.list() });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything shared with you, in one place."
        actions={
          <Button asChild>
            <Link to="/student/join">
              <PlusCircle className="mr-2 h-4 w-4" /> Join classroom
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={GraduationCap}
          label="Enrolled classes"
          value={stats.data?.enrolledClasses}
          loading={stats.isLoading}
        />
        <StatCard
          icon={BookOpen}
          label="Available lessons"
          value={stats.data?.availableMaterials}
          loading={stats.isLoading}
        />
        <StatCard
          icon={Layers}
          label="Topics covered"
          value={
            stats.data ? `${stats.data.completedTopics}/${stats.data.totalTopics}` : undefined
          }
          loading={stats.isLoading}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-semibold">Your classrooms</h2>
        {classrooms.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : (classrooms.data ?? []).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classrooms.data!.map((c) => (
              <div key={c.id} className="panel p-5">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.subject}</p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {c.facultyName ? `Taught by ${c.facultyName}` : "Faculty not set"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="You haven't joined a classroom yet"
            description="Ask your teacher for the class code, then join to see their lessons here."
            secondary={
              <Button variant="outline" asChild>
                <Link to="/student/join">Enter a class code</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Latest lessons</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/student/materials">View all</Link>
          </Button>
        </div>
        {materials.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : (materials.data ?? []).length > 0 ? (
          <div className="panel divide-y divide-border overflow-hidden">
            {materials.data!.slice(0, 5).map((m) => (
              <MaterialRow key={m.id} material={m} basePath="/student/materials" />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No lessons yet"
            description="Published lessons from your classrooms will appear here."
          />
        )}
      </section>
    </>
  );
}
