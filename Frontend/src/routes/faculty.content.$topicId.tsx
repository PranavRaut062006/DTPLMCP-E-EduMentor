import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Globe,
  Loader2,
  MonitorPlay,
  NotebookText,
  Presentation,
  Send,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { request, getAuthToken } from "@/services/api";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/faculty/content/$topicId")({
  head: () => ({
    meta: [
      { title: "Generated Content — TeachAI" },
      { name: "description", content: "Review, edit, publish or discard AI-generated teaching content." },
    ],
  }),
  component: ContentViewerPage,
});

const API_BASE = (import.meta.env as any)['VITE_API_URL'] ?? "http://localhost:3001/api";

async function fetchContent(topicId: string) {
  return request<any>(`/content/${topicId}`);
}

async function publishContent(topicId: string) {
  return request<any>(`/content/${topicId}/publish`, { method: "POST" });
}

async function discardSection(topicId: string, section: string) {
  return request<any>(`/content/${topicId}/discard/${section}`, { method: "PATCH" });
}

async function discardSlide(topicId: string, index: number) {
  return request<any>(`/content/${topicId}/slide/${index}`, { method: "DELETE" });
}

async function discardAll(topicId: string) {
  return request<any>(`/content/${topicId}`, { method: "DELETE" });
}

// Markdown renderer component
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function FormattedInlineText({ text }: { text: string }) {
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

// Slide card component
function SlideCard({
  slide,
  index,
  total,
  onDiscard,
}: {
  slide: any;
  index: number;
  total: number;
  onDiscard: () => void;
}) {
  const layoutLabel =
    slide.layout === "process_flow" || slide.diagram?.type === "flowchart"
      ? "Process Flow / Flowchart"
      : slide.layout === "comparison" || slide.diagram?.type === "comparison"
      ? "Comparison Analysis"
      : slide.layout === "cards_grid" || slide.diagram?.type === "grid"
      ? "Strategic Pillars & Components"
      : slide.layout === "case_study" || slide.diagram?.type === "case_study"
      ? "Real-World Case Study"
      : slide.layout === "discussion" || slide.diagram?.type === "discussion"
      ? "Interactive Class Discussion"
      : slide.layout === "summary" || slide.diagram?.type === "summary"
      ? "Summary & Key Takeaways"
      : "Standard Content";

  const nodes: any[] = slide.diagram?.nodes || (slide.bullets?.length > 0 ? slide.bullets.map((b: string, i: number) => {
    const parts = b.replace(/\*\*/g, '').split(/:\s*|-/);
    return { step: `0${i + 1}`, label: parts[0]?.trim() || `Step ${i + 1}`, description: parts[1]?.trim() || '' };
  }) : []);

  return (
    <div className="rounded-2xl border border-border bg-elevated/40 overflow-hidden">
      {/* Slide header bar */}
      <div className="flex items-center justify-between border-b border-border bg-elevated px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
            {index + 1}
          </span>
          <span className="text-xs text-muted-foreground">{layoutLabel}</span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard this slide?</AlertDialogTitle>
              <AlertDialogDescription>Slide {index + 1} "{slide.title}" will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Discard Slide
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Slide preview */}
      <div className="p-5">
        {/* Slide visual mock */}
        <div className="mb-4 rounded-xl bg-[#0F1117] border border-border/60 p-5 min-h-[160px]">
          <div className="mb-1 h-0.5 w-12 rounded-full bg-indigo-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-4"><FormattedInlineText text={slide.title} /></h3>
          
          {slide.layout === "process_flow" || slide.diagram?.type === "flowchart" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {nodes.slice(0, 4).map((node: any, i: number) => (
                <div key={i} className="rounded-xl border border-indigo-500/40 bg-slate-900/80 p-3 text-center">
                  <span className="inline-block rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 mb-1.5">
                    {node.step || `0${i + 1}`}
                  </span>
                  <p className="text-xs font-semibold text-white mb-1">{node.label}</p>
                  {node.description && <p className="text-[11px] text-slate-400 leading-snug">{node.description}</p>}
                </div>
              ))}
            </div>
          ) : slide.layout === "comparison" || slide.diagram?.type === "comparison" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-indigo-500/40 bg-slate-900/80 p-3.5">
                <p className="text-xs font-bold text-indigo-300 mb-2">{slide.diagram?.leftTitle || "Approach A"}</p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(slide.diagram?.leftItems || []).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5"><span className="text-indigo-400">•</span> <FormattedInlineText text={item} /></li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-teal-500/40 bg-slate-900/80 p-3.5">
                <p className="text-xs font-bold text-teal-300 mb-2">{slide.diagram?.rightTitle || "Approach B"}</p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(slide.diagram?.rightItems || []).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5"><span className="text-teal-400">•</span> <FormattedInlineText text={item} /></li>
                  ))}
                </ul>
              </div>
            </div>
          ) : slide.layout === "cards_grid" || slide.diagram?.type === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(slide.diagram?.cards || []).slice(0, 4).map((card: any, i: number) => (
                <div key={i} className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-3">
                  <p className="text-xs font-bold text-white mb-1.5">{card.title}</p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {(card.items || []).map((it: string, j: number) => (
                      <li key={j} className="flex items-start gap-1.5"><span className="text-indigo-400">•</span> <FormattedInlineText text={it} /></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : slide.layout === "case_study" || slide.diagram?.type === "case_study" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-500/40 bg-slate-900/80 p-3.5">
                <p className="text-xs font-bold text-amber-300 mb-1.5">🏢 {slide.diagram?.challengeTitle || "Challenge & Context"}</p>
                <p className="text-xs text-slate-300 mb-2 leading-relaxed">{slide.diagram?.challengeDesc}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/40 bg-slate-900/80 p-3.5">
                <p className="text-xs font-bold text-emerald-300 mb-1.5">💡 {slide.diagram?.solutionTitle || "Solution & Impact"}</p>
                <p className="text-xs text-slate-300 mb-2 leading-relaxed">{slide.diagram?.solutionDesc}</p>
                <ul className="space-y-1 text-[11px] text-emerald-200">
                  {(slide.diagram?.outcomes || []).map((o: string, j: number) => (
                    <li key={j}>✓ {o}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : slide.layout === "discussion" || slide.diagram?.type === "discussion" ? (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3.5">
                <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 mb-1.5">
                  🤔 Class Discussion
                </span>
                <p className="text-sm font-semibold text-white">{slide.diagram?.question || slide.title}</p>
              </div>
              <div className="rounded-xl border border-border bg-slate-900/80 p-3">
                <p className="text-xs font-bold text-teal-300 mb-1.5">💡 Key Discussion Angles:</p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {(slide.diagram?.discussionPoints || slide.bullets || []).map((p: string, j: number) => (
                    <li key={j} className="flex items-start gap-1.5"><span className="text-teal-400">•</span> <FormattedInlineText text={p} /></li>
                  ))}
                </ul>
              </div>
            </div>
          ) : slide.layout === "summary" || slide.diagram?.type === "summary" ? (
            <div className="space-y-2">
              {(slide.diagram?.takeaways || []).map((t: any, j: number) => (
                <div key={j} className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-slate-900/80 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">✓</span>
                  <div>
                    <span className="text-xs font-semibold text-white">{t.title}: </span>
                    <span className="text-xs text-slate-300">{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {(slide.bullets || []).map((b: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <FormattedInlineText text={b} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Script */}
        {slide.script && (
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Presenter Script
            </p>
            <p className="text-sm text-foreground leading-relaxed">{slide.script}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ContentViewerPage() {
  const { topicId } = useParams({ from: "/faculty/content/$topicId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOutputs] = useState(["teaching-plan", "ppt", "notes", "video"]);

  const searchParams = new URLSearchParams(window.location.search);
  const classroomId = searchParams.get("classroomId") || "";

  const contentQuery = useQuery({
    queryKey: ["content", topicId],
    queryFn: () => fetchContent(topicId),
    retry: 1,
  });

  const publishMutation = useMutation({
    mutationFn: () => publishContent(topicId),
    onSuccess: () => {
      toast.success("Content published! Students can now access it.");
      queryClient.invalidateQueries({ queryKey: ["content", topicId] });
    },
    onError: () => toast.error("Failed to publish. Please try again."),
  });

  const discardSectionMutation = useMutation({
    mutationFn: (section: string) => discardSection(topicId, section),
    onSuccess: (_, section) => {
      toast.success(`${section} discarded.`);
      queryClient.invalidateQueries({ queryKey: ["content", topicId] });
    },
    onError: () => toast.error("Failed to discard section."),
  });

  const discardSlideMutation = useMutation({
    mutationFn: (index: number) => discardSlide(topicId, index),
    onSuccess: () => {
      toast.success("Slide removed.");
      queryClient.invalidateQueries({ queryKey: ["content", topicId] });
    },
    onError: () => toast.error("Failed to remove slide."),
  });

  const discardAllMutation = useMutation({
    mutationFn: () => discardAll(topicId),
    onSuccess: () => {
      toast.success("All content discarded.");
      if (classroomId) navigate({ to: `/faculty/classrooms/${classroomId}` });
      else navigate({ to: "/faculty/classrooms" });
    },
    onError: () => toast.error("Failed to discard content."),
  });

  const handleDownloadPpt = async () => {
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
      let filename = "presentation.pptx";
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
  };

  const handleDownloadNotes = () => {
    const content = contentData?.notes_content;
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTeachingPlan = () => {
    const content = contentData?.lecture_content;
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teaching_plan.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (contentQuery.isLoading) {
    return (
      <div className="flex items-center gap-3 pt-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading content…
      </div>
    );
  }

  if (contentQuery.error || !contentQuery.data) {
    return (
      <div className="panel p-8 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="font-semibold">No content found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This topic's content may have been discarded or not yet generated.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => navigate({ to: classroomId ? `/faculty/classrooms/${classroomId}` : "/faculty/classrooms" })}>
          Back to Classroom
        </Button>
      </div>
    );
  }

  const contentData = contentQuery.data;
  const isPublished = contentData.status === "PUBLISHED";
  const slides: any[] = contentData.ppt_content || [];
  const hasTeachingPlan = !!contentData.lecture_content;
  const hasNotes = !!contentData.notes_content;
  const hasPPT = slides.length > 0;

  return (
    <>
      <PageHeader
        title="Generated Content"
        description={isPublished ? "This content is published and visible to students." : "Review your AI-generated content. Publish when ready."}
        crumbs={[
          { label: "Faculty", to: "/faculty" },
          { label: "Classrooms", to: "/faculty/classrooms" },
          ...(classroomId ? [{ label: "Classroom", to: `/faculty/classrooms/${classroomId}` }] : []),
          { label: "Content" },
        ]}
        actions={
          <>
            <Badge
              className={isPublished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>
            {!isPublished && (
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="gap-2"
              >
                {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publish to Students
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Discard All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard all generated content?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the teaching plan, notes, and all slides for this topic. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => discardAllMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Discard All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <Tabs defaultValue="teaching-plan" className="mt-2">
        <TabsList className="mb-6">
          <TabsTrigger value="teaching-plan" className="gap-2">
            <FileText className="h-3.5 w-3.5" /> Teaching Plan
          </TabsTrigger>
          <TabsTrigger value="ppt" className="gap-2">
            <Presentation className="h-3.5 w-3.5" /> Presentation
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <NotebookText className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-3.5 w-3.5" /> AI Video
          </TabsTrigger>
        </TabsList>

        {/* ── Teaching Plan Tab ── */}
        <TabsContent value="teaching-plan">
          {hasTeachingPlan ? (
            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" /> Teaching Plan
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadTeachingPlan} className="gap-2">
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> Discard
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Discard Teaching Plan?</AlertDialogTitle>
                        <AlertDialogDescription>The teaching plan will be permanently removed from this topic.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => discardSectionMutation.mutate("teaching-plan")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Discard
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-elevated/40 p-6">
                <MarkdownContent content={contentData.lecture_content} />
              </div>
            </div>
          ) : (
            <div className="panel p-10 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium">NO CONTENT HERE AS IT'S NOT SELECTED</p>
              <p className="mt-1 text-sm">Teaching Plan was not selected during generation.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Presentation Tab ── */}
        <TabsContent value="ppt">
          {hasPPT ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{slides.length}</span> slides generated
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadPpt} className="gap-2">
                    <Download className="h-4 w-4" /> Download .pptx
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> Discard All Slides
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Discard all slides?</AlertDialogTitle>
                        <AlertDialogDescription>All {slides.length} slides will be permanently removed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => discardSectionMutation.mutate("ppt")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Discard All Slides
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-4">
                {slides.map((slide, idx) => (
                  <SlideCard
                    key={idx}
                    slide={slide}
                    index={idx}
                    total={slides.length}
                    onDiscard={() => discardSlideMutation.mutate(idx)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="panel p-10 text-center text-muted-foreground">
              <Presentation className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium">NO CONTENT HERE AS IT'S NOT SELECTED</p>
              <p className="mt-1 text-sm">Presentation was not selected during generation.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Notes Tab ── */}
        <TabsContent value="notes">
          {hasNotes ? (
            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-foreground">
                  <NotebookText className="h-4 w-4 text-primary" /> Student Notes
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadNotes} className="gap-2">
                    <Download className="h-4 w-4" /> Download Notes
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> Discard
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Discard Notes?</AlertDialogTitle>
                        <AlertDialogDescription>The student notes will be permanently removed from this topic.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => discardSectionMutation.mutate("notes")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Discard
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-elevated/40 p-6">
                <MarkdownContent content={contentData.notes_content} />
              </div>
            </div>
          ) : (
            <div className="panel p-10 text-center text-muted-foreground">
              <NotebookText className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium">NO CONTENT HERE AS IT'S NOT SELECTED</p>
              <p className="mt-1 text-sm">Notes were not selected during generation.</p>
            </div>
          )}
        </TabsContent>

        {/* ── AI Video Tab ── */}
        <TabsContent value="video">
          <div className="panel p-10 text-center text-muted-foreground">
            <MonitorPlay className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">AI Video — Coming Soon</p>
            <p className="mt-1 text-sm">
              AI video generation will be implemented in a future release. The presentation script is already available in the Presentation tab.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
