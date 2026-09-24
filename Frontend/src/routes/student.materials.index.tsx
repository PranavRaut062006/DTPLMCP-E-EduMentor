import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { materialService } from "@/services";
import { MaterialRow } from "@/components/faculty/MaterialRow";

export const Route = createFileRoute("/student/materials/")({
  head: () => ({
    meta: [
      { title: "Lessons — TeachAI" },
      {
        name: "description",
        content: "Browse every lesson, note set and lecture video published to your classrooms.",
      },
      { property: "og:title", content: "Lessons — TeachAI" },
      { property: "og:description", content: "All your study material in one library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentMaterials,
});

function StudentMaterials() {
  const [query, setQuery] = useState("");
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => materialService.list() });

  const published = (materials.data ?? []).filter(
    (m) => m.status === "published" && m.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Lessons"
        description="Everything your teachers have published to the classrooms you joined."
        crumbs={[{ label: "Student", to: "/student" }, { label: "Lessons" }]}
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons"
          className="pl-9"
        />
      </div>

      {materials.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : published.length > 0 ? (
        <div className="panel divide-y divide-border overflow-hidden">
          {published.map((m) => (
            <MaterialRow key={m.id} material={m} basePath="/student/materials" />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No lessons available yet"
          description="Once you join a classroom and your teacher publishes a lesson, it shows up here."
          secondary={
            <Button variant="outline" asChild>
              <Link to="/student/join">Join a classroom</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
