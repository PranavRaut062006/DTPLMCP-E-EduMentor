import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  NotebookText,
  Presentation,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { request, getAuthToken } from "@/services/api";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/student/classroom/$classroomId")({
  head: () => ({
    meta: [
      { title: "Classroom — TeachAI" },
      { name: "description", content: "Access published learning materials in your classroom." },
    ],
  }),
  component: StudentClassroomPage,
});

const API_BASE = (import.meta.env as any)['VITE_API_URL'] ?? "http://localhost:3001/api";

async function fetchClassroomContent(classroomId: string) {
  return request<any[]>(`/content/classroom/${classroomId}`);
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

async function handleDownloadPpt(topicId: string, topicTitle: string) {
  const token = getAuthToken();
  const url = `${API_BASE}/content/${topicId}/download/ppt${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      throw new Error(errorJson?.error || `Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    const contentHeader = res.headers.get("Content-Disposition");
    let filename = `${topicTitle.replace(/[^a-z0-9]/gi, "_")}_presentation.pptx`;
    if (contentHeader && contentHeader.includes("filename=")) {
      const match = contentHeader.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success("Presentation downloaded!");
  } catch (err: any) {
    toast.error(err.message || "Failed to download PPTX.");
  }
}

function handleDownloadNotes(content: string, topicTitle: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${topicTitle.replace(/[^a-z0-9]/gi, "_")}_notes.md`;
  a.click();
  URL.revokeObjectURL(url);
}function FormattedInlineText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
}

function TopicContentCard({ item }: { item: any }) {
  const slides: any[] = item.ppt_content || [];
  const hasNotes = !!item.notes_content;
  const hasPPT = slides.length > 0;

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-elevated/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{item.topicTitle}</h3>
          </div>
        </div>
        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
          Published
        </Badge>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue={hasNotes ? "notes" : hasPPT ? "ppt" : "none"} className="p-5">
        <TabsList className="mb-4">
          <TabsTrigger value="notes" className="gap-1.5 text-xs">
            <NotebookText className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="ppt" className="gap-1.5 text-xs">
            <Presentation className="h-3.5 w-3.5" /> Slides
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1.5 text-xs">
            <Video className="h-3.5 w-3.5" /> AI Video
          </TabsTrigger>
        </TabsList>

        {/* Notes */}
        <TabsContent value="notes">
          {hasNotes ? (
            <div>
              <div className="mb-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleDownloadNotes(item.notes_content, item.topicTitle)}
                >
                  <Download className="h-3.5 w-3.5" /> Download Notes
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-elevated/40 p-5 max-h-[500px] overflow-y-auto">
                <MarkdownContent content={item.notes_content} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <NotebookText className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Notes not available for this topic.
            </div>
          )}
        </TabsContent>

        {/* PPT Slides */}
        <TabsContent value="ppt">
          {hasPPT ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{slides.length} slides</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleDownloadPpt(item.topic_id, item.topicTitle)}
                >
                  <Download className="h-3.5 w-3.5" /> Download .pptx
                </Button>
              </div>
              <div className="space-y-3">
                {slides.map((slide: any, idx: number) => {
                  const nodes: any[] = slide.diagram?.nodes || (slide.bullets?.length > 0 ? slide.bullets.map((b: string, i: number) => {
                    const parts = b.replace(/\*\*/g, '').split(/:\s*|-/);
                    return { step: `0${i + 1}`, label: parts[0]?.trim() || `Step ${i + 1}`, description: parts[1]?.trim() || '' };
                  }) : []);

                  return (
                    <div key={idx} className="rounded-xl border border-border bg-[#0F1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-white"><FormattedInlineText text={slide.title} /></h4>
                      </div>
                      {slide.layout === "process_flow" || slide.diagram?.type === "flowchart" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                          {nodes.slice(0, 4).map((node: any, i: number) => (
                            <div key={i} className="rounded-lg border border-indigo-500/30 bg-slate-900/80 p-2.5 text-center">
                              <span className="inline-block rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 mb-1">
                                {node.step || `0${i + 1}`}
                              </span>
                              <p className="text-xs font-semibold text-white">{node.label}</p>
                              {node.description && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{node.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : slide.layout === "comparison" || slide.diagram?.type === "comparison" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          <div className="rounded-lg border border-indigo-500/30 bg-slate-900/80 p-2.5">
                            <p className="text-xs font-bold text-indigo-300 mb-1">{slide.diagram?.leftTitle || "Approach A"}</p>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {(slide.diagram?.leftItems || []).map((item: string, i: number) => (
                                <li key={i}><FormattedInlineText text={item} /></li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg border border-teal-500/30 bg-slate-900/80 p-2.5">
                            <p className="text-xs font-bold text-teal-300 mb-1">{slide.diagram?.rightTitle || "Approach B"}</p>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {(slide.diagram?.rightItems || []).map((item: string, i: number) => (
                                <li key={i}><FormattedInlineText text={item} /></li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : slide.layout === "cards_grid" || slide.diagram?.type === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {(slide.diagram?.cards || []).slice(0, 4).map((card: any, i: number) => (
                            <div key={i} className="rounded-lg border border-indigo-500/30 bg-slate-900/80 p-2.5">
                              <p className="text-xs font-bold text-white mb-1">{card.title}</p>
                              <ul className="space-y-0.5 text-[11px] text-slate-300">
                                {(card.items || []).map((it: string, j: number) => (
                                  <li key={j}><FormattedInlineText text={it} /></li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : slide.layout === "case_study" || slide.diagram?.type === "case_study" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          <div className="rounded-lg border border-amber-500/30 bg-slate-900/80 p-2.5">
                            <p className="text-xs font-bold text-amber-300 mb-1">🏢 {slide.diagram?.challengeTitle || "Challenge"}</p>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{slide.diagram?.challengeDesc}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-500/30 bg-slate-900/80 p-2.5">
                            <p className="text-xs font-bold text-emerald-300 mb-1">💡 {slide.diagram?.solutionTitle || "Solution"}</p>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{slide.diagram?.solutionDesc}</p>
                          </div>
                        </div>
                      ) : slide.layout === "discussion" || slide.diagram?.type === "discussion" ? (
                        <div className="space-y-2 mt-2">
                          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
                            <p className="text-xs font-semibold text-white">🤔 {slide.diagram?.question || slide.title}</p>
                          </div>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {(slide.diagram?.discussionPoints || slide.bullets || []).map((p: string, j: number) => (
                              <li key={j} className="flex items-start gap-1.5"><span className="text-teal-400">•</span> <FormattedInlineText text={p} /></li>
                            ))}
                          </ul>
                        </div>
                      ) : slide.layout === "summary" || slide.diagram?.type === "summary" ? (
                        <div className="space-y-1.5 mt-2">
                          {(slide.diagram?.takeaways || []).map((t: any, j: number) => (
                            <div key={j} className="flex items-center gap-2 rounded border border-emerald-500/20 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span><strong className="text-white">{t.title}:</strong> {t.desc}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {(slide.bullets || []).map((b: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                              <FormattedInlineText text={b} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Presentation className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No slides available for this topic.
            </div>
          )}
        </TabsContent>

        {/* Video */}
        <TabsContent value="video">
          {item.video_status === "COMPLETED" && item.video_url ? (
            <div className="rounded-xl border border-border bg-elevated/40 overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center">
                <video 
                  controls 
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain"
                  src={`${(import.meta.env as any)['VITE_API_URL']?.replace('/api', '') || "http://localhost:3001"}${item.video_url}`}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Video className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="font-medium">Video not available</p>
              <p className="mt-1 text-xs">The video for this topic has not been generated or published yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentClassroomPage() {
  const { classroomId } = useParams({ from: "/student/classroom/$classroomId" });

  const contentQuery = useQuery({
    queryKey: ["student-classroom-content", classroomId],
    queryFn: () => fetchClassroomContent(classroomId),
    retry: 1,
  });

  const items = contentQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Classroom Materials"
        description="Published learning materials from your teacher."
        crumbs={[
          { label: "Student", to: "/student" },
          { label: "Classroom Materials" },
        ]}
      />

      {contentQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No published content yet"
          description="Your teacher hasn't published any material for this classroom yet. Check back soon!"
        />
      ) : (
        <div className="space-y-5">
          {items.map((item: any) => (
            <TopicContentCard key={item.topic_id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
