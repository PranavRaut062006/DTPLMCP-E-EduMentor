import { useEffect, useRef, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileUp,
  Layers,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NotConnectedError, syllabusService } from "@/services";
import type { SyllabusUnit } from "@/services/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/faculty/classrooms/$id/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus manager — TeachAI" },
      { name: "description", content: "Upload a syllabus or structure units and topics for AI content generation." },
      { property: "og:title", content: "Syllabus manager — TeachAI" },
      { property: "og:description", content: "Structure your course into units and topics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SyllabusManager,
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type UploadState =
  | { phase: "idle" }
  | { phase: "parsing"; fileName: string; progress: number }
  | { phase: "done"; fileName: string; totalTopics: number };

function SyllabusManager() {
  const { id } = useParams({ from: "/faculty/classrooms/$id/syllabus" });
  const queryClient = useQueryClient();
  const remote = useQuery({ queryKey: ["syllabus", id], queryFn: () => syllabusService.get(id) });
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ phase: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fake progress ticker while parsing
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remote.data) setUnits(remote.data);
  }, [remote.data]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  function addUnit() {
    setUnits((u) => [...u, { id: uid(), title: "", topics: [] }]);
  }

  async function save() {
    setSaving(true);
    try {
      await syllabusService.save(id, units);
      toast.success("Syllabus saved");
    } catch (error) {
      toast.error(
        error instanceof NotConnectedError
          ? "Saving needs the backend to be connected."
          : "Could not save the syllabus.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(file: File) {
    if (!file) return;

    const isValid = file.type === "application/pdf" || file.name.endsWith(".pdf");
    if (!isValid) {
      toast.error("Only PDF files are supported for automatic parsing.");
      return;
    }

    // Start upload state + fake progress
    setUploadState({ phase: "parsing", fileName: file.name, progress: 5 });
    progressRef.current = setInterval(() => {
      setUploadState((prev) => {
        if (prev.phase !== "parsing") return prev;
        const next = Math.min(prev.progress + Math.random() * 8, 88);
        return { ...prev, progress: next };
      });
    }, 800);

    try {
      const result = await syllabusService.uploadPdf(id, file);

      if (progressRef.current) clearInterval(progressRef.current);
      setUploadState({ phase: "done", fileName: file.name, totalTopics: result.totalTopics });

      // Hydrate the unit editor with the extracted structure
      setUnits(result.units);

      // Refresh the syllabus query cache
      queryClient.invalidateQueries({ queryKey: ["syllabus", id] });

      toast.success(
        `✅ PDF parsed! ${result.units.length} units, ${result.totalTopics} topics extracted. PPT slides are generating in the background.`,
        { duration: 6000 },
      );
    } catch (err: any) {
      if (progressRef.current) clearInterval(progressRef.current);
      setUploadState({ phase: "idle" });
      toast.error(
        err instanceof NotConnectedError
          ? "The backend is not connected. Start the backend server first."
          : err.message || "PDF upload failed — please try again.",
      );
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  return (
    <>
      <PageHeader
        title="Syllabus manager"
        description="Upload a syllabus PDF — AI will extract all units and topics and auto-generate PPT slides."
        crumbs={[
          { label: "Classrooms", to: "/faculty/classrooms" },
          { label: "Classroom", to: `/faculty/classrooms/${id}` },
          { label: "Syllabus" },
        ]}
        actions={
          <Button onClick={save} disabled={saving || units.length === 0}>
            <Save className="mr-2 h-4 w-4" /> Save syllabus
          </Button>
        }
      />

      {/* ── Upload Zone ─────────────────────────────────────────────────── */}
      {uploadState.phase === "idle" || uploadState.phase === "done" ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload syllabus PDF"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "panel mb-6 flex cursor-pointer flex-col items-center justify-center border-dashed px-6 py-10 text-center transition-all select-none",
            isDragging
              ? "border-primary/70 bg-primary/5 scale-[1.01]"
              : "hover:border-primary/40",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onFileInput}
            onClick={(e) => e.stopPropagation()}
          />

          {uploadState.phase === "done" ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                {uploadState.fileName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {uploadState.totalTopics} topics extracted · PPT slides generating in background
              </p>
              <p className="mt-3 text-xs text-primary underline underline-offset-2">
                Upload a new PDF to replace
              </p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-elevated">
                <UploadCloud className="h-7 w-7 text-primary" />
              </div>
              <p className="mt-4 text-sm font-medium">
                Drop your syllabus PDF here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse — AI will extract all units and topics automatically
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Gemini AI-powered extraction · PPT auto-generation</span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Upload Progress ──────────────────────────────────────────── */
        <div className="panel mb-6 px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated">
              <FileUp className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{uploadState.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {uploadState.progress < 40
                  ? "Parsing PDF text…"
                  : uploadState.progress < 75
                    ? "Extracting units and topics with Gemini AI…"
                    : "Saving structure and queuing PPT generation…"}
              </p>
            </div>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          </div>
          <Progress value={uploadState.progress} className="h-1.5" />
        </div>
      )}

      {/* ── Unit / Topic editor ─────────────────────────────────────────── */}
      {units.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {units.length} units · {units.reduce((s, u) => s + u.topics.length, 0)} topics
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            You can edit any unit or topic name below, then save.
          </span>
        </div>
      )}

      <div className="space-y-4">
        {units.map((unit, unitIndex) => (
          <div key={unit.id} className="panel p-5">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Unit {unitIndex + 1}</Badge>
              <Input
                placeholder="Unit title"
                value={unit.title}
                onChange={(e) =>
                  setUnits((prev) =>
                    prev.map((u) => (u.id === unit.id ? { ...u, title: e.target.value } : u)),
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove unit"
                onClick={() => setUnits((prev) => prev.filter((u) => u.id !== unit.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {unit.topics.map((topic) => (
                <div key={topic.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Topic title"
                    value={topic.title}
                    onChange={(e) =>
                      setUnits((prev) =>
                        prev.map((u) =>
                          u.id === unit.id
                            ? {
                                ...u,
                                topics: u.topics.map((t) =>
                                  t.id === topic.id ? { ...t, title: e.target.value } : t,
                                ),
                              }
                            : u,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove topic"
                    onClick={() =>
                      setUnits((prev) =>
                        prev.map((u) =>
                          u.id === unit.id
                            ? { ...u, topics: u.topics.filter((t) => t.id !== topic.id) }
                            : u,
                        ),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setUnits((prev) =>
                    prev.map((u) =>
                      u.id === unit.id
                        ? { ...u, topics: [...u.topics, { id: uid(), title: "" }] }
                        : u,
                    ),
                  )
                }
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Add topic
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="mt-4" onClick={addUnit}>
        <Plus className="mr-2 h-4 w-4" /> Add unit manually
      </Button>
    </>
  );
}
