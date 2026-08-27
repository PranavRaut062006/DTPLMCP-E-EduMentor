import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Loader2, Sparkles, Send } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/faculty/")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — TeachGen AI" },
      { name: "description", content: "Track subjects, generated e-content and published material." },
      { property: "og:title", content: "Faculty Dashboard — TeachGen AI" },
      { property: "og:description", content: "Your syllabus-to-content workspace overview." },
    ],
  }),
  component: FacultyDashboard,
});

function FacultyDashboard() {
  const { user, name } = useAuth();

  const stats = useQuery({
    queryKey: ["faculty-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('teachai_token');
      
      const res = await fetch('/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const subjects = await res.json();
      
      let topicCount = 0;
      let published = 0;
      let drafts = 0;
      
      // In a real app, you might have an aggregate endpoint, but we'll fetch details here
      for (const subject of subjects) {
        const unitsRes = await fetch(`/api/units?subjectId=${subject.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const units = await unitsRes.json();
        
        for (const unit of units) {
          const topicsRes = await fetch(`/api/topics?unitId=${unit.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const topics = await topicsRes.json();
          
          topicCount += topics.length;
          published += topics.filter((t: any) => t.status === "PUBLISHED").length;
          drafts += topics.filter((t: any) => t.status === "DRAFT" || t.status === "APPROVED").length;
        }
      }
      
      return { subjects, topicCount, published, drafts };
    },
  });

  const cards = [
    { label: "Subjects", value: stats.data?.subjects.length ?? 0, icon: BookOpen },
    { label: "Topics", value: stats.data?.topicCount ?? 0, icon: FileText },
    { label: "In Progress", value: stats.data?.drafts ?? 0, icon: Sparkles },
    { label: "Published", value: stats.data?.published ?? 0, icon: Send },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome${name ? `, ${name.split(" ")[0]}` : ""}`}
        description="Upload a syllabus, generate e-content and publish approved material to students."
        action={
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/faculty/subjects">Manage subjects</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Recent subjects</h2>
      {stats.isLoading ? (
        <div className="panel flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your workspace…
        </div>
      ) : stats.data?.subjects.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.data.subjects.slice(0, 6).map((s: any) => (
            <Link
              key={s.id}
              to="/faculty/subjects/$subjectId"
              params={{ subjectId: s.id }}
              className="panel block p-5 transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">{s.code}</p>
              <p className="mt-2 text-lg font-semibold">{s.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[s.department, s.semester].filter(Boolean).join(" · ") || "No department set"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center">
          <p className="font-medium">No subjects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first subject to explore the workflow.
          </p>
          <Button asChild className="mt-5">
            <Link to="/faculty/subjects">Create a subject</Link>
          </Button>
        </div>
      )}
    </>
  );
}
