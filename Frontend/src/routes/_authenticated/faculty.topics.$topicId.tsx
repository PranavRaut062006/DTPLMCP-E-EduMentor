import { createFileRoute, Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Download, FileDown, Loader2, Save, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { LectureView, PptView } from "@/components/LectureView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { downloadPptx } from "@/lib/ppt";
import type { ContentStatus, LectureContent, PptContent } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/faculty/topics/$topicId")({
  head: () => ({
    meta: [
      { title: "Topic Editor — TeachGen AI" },
      { name: "description", content: "Generate, review and publish lecture content and slide outlines." },
      { property: "og:title", content: "Topic Editor — TeachGen AI" },
      { property: "og:description", content: "Faculty review and approval workflow for generated e-content." },
    ],
  }),
  component: TopicEditor,
});

function TopicEditor() {
  const { topicId } = Route.useParams();
  const qc = useQueryClient();

  const content = useQuery({
    queryKey: ["content", topicId],
    queryFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch(`/api/content/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch content");
      return res.json();
    },
  });

  const [draft, setDraft] = useState<any>({});
  const [activeTab, setActiveTab] = useState("lecture");

  const lecture = content.data?.lecture_content || draft.plan;
  const ppt = content.data?.ppt_content || draft.slides;
  const status = content.data?.status || "NOT_GENERATED";

  const save = useMutation({
    mutationFn: async (nextStatus: ContentStatus = "DRAFT") => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch(`/api/content/${topicId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lecture_content: lecture,
          ppt_content: ppt,
          status: nextStatus
        })
      });
      if (!res.ok) throw new Error("Failed to save");
      
      const topicRes = await fetch(`/api/topics/${topicId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      
      return nextStatus;
    },
    onSuccess: (s) => {
      toast.success(`Saved as ${s}.`);
      void qc.invalidateQueries({ queryKey: ["content", topicId] });
      void qc.invalidateQueries({ queryKey: ["structure"] });
      void qc.invalidateQueries({ queryKey: ["faculty-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateLecture = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch(`/api/generate/topic/${topicId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ durationHours: 4, references: "" })
      });
      if (!res.ok) throw new Error("Generation failed");
      return res.json();
    },
    onSuccess: (data) => {
      setDraft(data.data);
      setActiveTab("lecture");
      toast.success("Content generated successfully.");
      void qc.invalidateQueries({ queryKey: ["content", topicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateVideo = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch(`/api/generate/video/${topicId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Video generation failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Video generation started in background. You will be notified when it's ready.");
    },
    onError: (e: Error) => toast.error(e.message),
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
        title={"Topic Content Generation"}
        description={"Generate lecture scripts, slides, and video."}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status as any} />
            {lecture && (
              <>
                <Button variant="outline" size="sm" onClick={() => save.mutate("DRAFT")} disabled={save.isPending}>
                  <Save className="size-4" /> Save draft
                </Button>
                <Button variant="outline" size="sm" onClick={() => save.mutate("APPROVED")} disabled={save.isPending}>
                  <Check className="size-4" /> Approve
                </Button>
                <Button size="sm" onClick={() => save.mutate("PUBLISHED")} disabled={save.isPending}>
                  <FileDown className="size-4" /> Publish
                </Button>
              </>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="lecture">Lecture & Plan</TabsTrigger>
          <TabsTrigger value="slides">Slides</TabsTrigger>
          <TabsTrigger value="video">Video Lecture</TabsTrigger>
        </TabsList>

        <TabsContent value="lecture" className="space-y-4">
          {!lecture ? (
            <div className="panel p-8 text-center">
              <p className="font-medium">No lecture content yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate structured lecture notes and script using Gemini AI.
              </p>
              <Button className="mt-5" onClick={() => generateLecture.mutate()} disabled={generateLecture.isPending}>
                {generateLecture.isPending && <Loader2 className="size-4 animate-spin" />}
                <Sparkles className="size-4" /> Generate Content
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="panel p-6 prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{typeof lecture === 'string' ? lecture : JSON.stringify(lecture, null, 2)}</ReactMarkdown>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="slides" className="space-y-4">
          {!ppt ? (
            <div className="panel p-8 text-center">
              <p className="font-medium">No slide outline yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate slides along with the lecture content first.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => downloadPptx(`Presentation`, "", ppt)}>
                  <Download className="size-4" /> Download .pptx
                </Button>
              </div>
              <div className="mt-4">
                <PptView ppt={ppt} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <div className="panel p-8 text-center">
            <Video className="mx-auto size-12 text-muted-foreground mb-4" />
            <p className="font-medium">Video Generation</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This will convert the generated lecture script to audio (TTS) and combine it with the slides using FFmpeg.
            </p>
            <Button 
              className="mt-5" 
              variant="secondary" 
              onClick={() => generateVideo.mutate()}
              disabled={generateVideo.isPending || !ppt}
            >
              {generateVideo.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
              Generate Video Lecture
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
