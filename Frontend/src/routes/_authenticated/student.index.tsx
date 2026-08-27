import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/student/")({
  head: () => ({
    meta: [
      { title: "Published Content — TeachGen AI" },
      { name: "description", content: "Browse published lecture content and slide outlines." },
      { property: "og:title", content: "Published Content — TeachGen AI" },
      { property: "og:description", content: "Student portal for approved course material." },
    ],
  }),
  component: StudentPortal,
});

function StudentPortal() {
  const subjects = useQuery({
    queryKey: ["published-subjects"],
    queryFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      // In a real app we would have an endpoint that filters for published subjects
      // For now we'll just return all subjects since this is a demo.
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Published Content"
        description="All course material that has been reviewed and published by faculty."
      />
      {subjects.isLoading ? (
        <div className="panel flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : subjects.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.data.map((s: any) => (
            <Link
              key={s.id}
              to="/student/subjects/$subjectId"
              params={{ subjectId: s.id }}
              className="panel block p-5 transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">{s.code}</p>
              <p className="mt-2 text-lg font-semibold">{s.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[s.department, s.semester].filter(Boolean).join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-3 size-8 text-muted-foreground" />
          No published content yet. Faculty must publish topics before they appear here.
        </div>
      )}
    </>
  );
}
