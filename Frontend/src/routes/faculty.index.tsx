import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Library, Presentation, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { classroomService, materialService, statsService } from "@/services";
import { ClassroomCard } from "@/components/faculty/ClassroomCard";
import { MaterialRow } from "@/components/faculty/MaterialRow";

export const Route = createFileRoute("/faculty/")({
  head: () => ({
    meta: [
      { title: "Faculty dashboard — TeachAI" },
      { name: "description", content: "Overview of your classrooms, published materials and generated content." },
      { property: "og:title", content: "Faculty dashboard — TeachAI" },
      { property: "og:description", content: "Track classrooms, students and AI-generated teaching material." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacultyDashboard,
});

function FacultyDashboard() {
  const stats = useQuery({ queryKey: ["stats", "faculty"], queryFn: statsService.faculty });
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: classroomService.list });
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => materialService.list() });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your classrooms, content pipeline and publishing activity at a glance."
        actions={
          <Button asChild>
            <Link to="/faculty/generate">
              <Sparkles className="mr-2 h-4 w-4" /> Generate content
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Presentation} label="Classrooms" value={stats.data?.classrooms} loading={stats.isLoading} />
        <StatCard icon={Library} label="Published materials" value={stats.data?.publishedMaterials} loading={stats.isLoading} />
        <StatCard icon={Users} label="Students reached" value={stats.data?.students} loading={stats.isLoading} />
        <StatCard icon={Sparkles} label="Generated content" value={stats.data?.generatedContent} loading={stats.isLoading} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your classrooms</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/faculty/classrooms">View all</Link>
          </Button>
        </div>
        {classrooms.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : classrooms.data && classrooms.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classrooms.data.slice(0, 3).map((c) => (
              <ClassroomCard key={c.id} classroom={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Presentation}
            title="No classrooms yet"
            description="Create your first classroom to upload a syllabus and start generating teaching content."
            secondary={
              <Button asChild>
                <Link to="/faculty/classrooms">Create classroom</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent materials</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/faculty/materials">View all</Link>
          </Button>
        </div>
        {materials.isLoading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : materials.data && materials.data.length > 0 ? (
          <div className="panel divide-y divide-border overflow-hidden">
            {materials.data.slice(0, 5).map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Library}
            title="No materials generated yet"
            description="Generated teaching plans, slides, notes and lectures will appear here."
          />
        )}
      </section>
    </>
  );
}
