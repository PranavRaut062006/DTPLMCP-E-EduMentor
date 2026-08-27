import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { LectureView, PptView } from "@/components/LectureView";
import type { ContentRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/student/subjects/$subjectId")({
  head: () => ({
    meta: [
      { title: "Course Content — TeachGen AI" },
      { name: "description", content: "View published lecture notes and slide outlines for this subject." },
      { property: "og:title", content: "Course Content — TeachGen AI" },
      { property: "og:description", content: "Published student material." },
    ],
  }),
  component: StudentSubject,
});

function StudentSubject() {
  const { subjectId } = Route.useParams();

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

  const published = useQuery({
    queryKey: ["student-content", subjectId],
    queryFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const unitsRes = await fetch(`/api/units?subjectId=${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!unitsRes.ok) throw new Error("Failed to fetch units");
      const units = await unitsRes.json();

      const unitsWithTopics = await Promise.all(units.map(async (u: any) => {
        const topicsRes = await fetch(`/api/topics?unitId=${u.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        let topics = await topicsRes.json();
        topics = topics.filter((t: any) => t.status === "PUBLISHED");
        
        const topicsWithContent = await Promise.all(topics.map(async (t: any) => {
          const contentRes = await fetch(`/api/content/${t.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const content = contentRes.ok ? await contentRes.json() : null;
          return { ...t, content };
        }));

        return { ...u, topics: topicsWithContent };
      }));
      
      return unitsWithTopics;
    },
  });

  return (
    <>
      <Link
        to="/student"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to portal
      </Link>

      <PageHeader
        title={subject.data?.name ?? "Subject"}
        description={subject.data ? `${subject.data.code}${subject.data.semester ? ` · ${subject.data.semester}` : ""}` : ""}
      />

      {published.isLoading ? (
        <div className="panel flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading content…
        </div>
      ) : (
        <div className="space-y-8">
          {published.data?.map((unit: any) => (
            <div key={unit.id} className="panel overflow-hidden">
              <div className="border-b border-border bg-surface px-5 py-3">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">Unit {unit.unit_number}</p>
                <p className="font-semibold">{unit.title}</p>
              </div>
              <div className="divide-y divide-border">
                {unit.topics.length === 0 && (
                  <p className="px-5 py-4 text-sm text-muted-foreground">No published topics in this unit.</p>
                )}
                {unit.topics.map((topic: any) => (
                  <div key={topic.id} className="px-5 py-6">
                    <h3 className="text-lg font-semibold">{topic.title}</h3>
                    {topic.content?.lecture_content && (
                      <div className="mt-4">
                        <LectureView lecture={topic.content.lecture_content as never} />
                      </div>
                    )}
                    {topic.content?.ppt_content && (
                      <div className="mt-6">
                        <p className="mb-3 text-sm font-semibold tracking-widest text-primary uppercase">
                          Slide outline
                        </p>
                        <PptView ppt={topic.content.ppt_content as never} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
