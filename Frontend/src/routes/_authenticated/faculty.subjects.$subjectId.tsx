import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import type { ContentStatus } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/faculty/subjects/$subjectId")({
  head: () => ({
    meta: [
      { title: "Subject Workspace — TeachGen AI" },
      { name: "description", content: "Upload the syllabus PDF and work through extracted units and topics." },
      { property: "og:title", content: "Subject Workspace — TeachGen AI" },
      { property: "og:description", content: "Syllabus upload, unit extraction and topic generation." },
    ],
  }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const { user } = useAuth();

  const subject = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch(`/api/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch subject");
      return res.json();
    },
  });

  const structure = useQuery({
    queryKey: ["structure", subjectId],
    queryFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch(`/api/units?subjectId=${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch units");
      const units = await res.json();
      
      const unitsWithTopics = await Promise.all(units.map(async (u: any) => {
        const topicsRes = await fetch(`/api/topics?unitId=${u.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const topics = await topicsRes.json();
        return { ...u, topics };
      }));
      
      return unitsWithTopics;
    },
  });

  return (
    <>
      <Link
        to="/faculty/subjects"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to subjects
      </Link>

      <PageHeader
        title={subject.data?.name ?? "Subject"}
        description={
          subject.data
            ? `${subject.data.code}${subject.data.department ? ` · ${subject.data.department}` : ""}${
                subject.data.semester ? ` · ${subject.data.semester}` : ""
              }`
            : ""
        }
      />

      <div className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Syllabus</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add units and topics manually, or use the automated PDF extraction.
            </p>
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              id="syllabus-upload" 
              accept="application/pdf" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                const token = localStorage.getItem("teachai_token");
                const formData = new FormData();
                formData.append("syllabus", file);

                const toastId = toast.loading("Parsing PDF with AI...");
                try {
                  const res = await fetch(`/api/subjects/${subjectId}/syllabus`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to upload and parse syllabus");
                  }
                  
                  // Refetch the structure to see the newly generated units and topics
                  toast.success("Syllabus parsed successfully!", { id: toastId });
                  window.location.reload(); // Simple way to refresh data
                } catch (err: any) {
                  toast.error(err.message, { id: toastId });
                }
              }}
            />
            <Button variant="outline" asChild>
              <label htmlFor="syllabus-upload" className="cursor-pointer">
                Upload syllabus PDF
              </label>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Units &amp; Topics</h2>
        <Button size="sm" onClick={() => alert('Add unit form to be implemented')}>
          <Plus className="mr-1 size-4" /> Add Unit
        </Button>
      </div>
      
      {structure.isLoading ? (
        <div className="panel flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading structure…
        </div>
      ) : structure.data?.length ? (
        <div className="space-y-5">
          {structure.data.map((unit) => (
            <div key={unit.id} className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Unit {unit.unit_number}
                  </p>
                  <p className="font-semibold">{unit.title}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => alert('Add topic form to be implemented')}>
                  <Plus className="size-4" /> Add Topic
                </Button>
              </div>
              <ul className="divide-y divide-border">
                {unit.topics.length === 0 && (
                  <li className="px-5 py-4 text-sm text-muted-foreground">No topics in this unit.</li>
                )}
                {unit.topics.map((topic: any) => (
                  <li key={topic.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{topic.title}</p>
                      {topic.subtopics?.length > 0 && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {topic.subtopics.join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={topic.status as ContentStatus} />
                      <Button asChild size="sm" variant="outline">
                        <Link to="/faculty/topics/$topicId" params={{ topicId: topic.id }}>
                          <Sparkles className="size-4" />
                          {topic.status === "NOT_GENERATED" ? "Generate" : "Open"}
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          No units yet. Add a unit manually or upload a syllabus.
        </div>
      )}
    </>
  );
}
