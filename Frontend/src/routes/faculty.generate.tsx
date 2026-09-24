import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  FileText,
  Globe,
  Link2,
  Loader2,
  Presentation,
  Sparkles,
  Upload,
  Youtube,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { syllabusService, generationService } from "@/services";
import { kindMeta } from "@/components/faculty/MaterialRow";
import type { ContentKind, ReferenceItem, ReferenceKind } from "@/services/types";

export const Route = createFileRoute("/faculty/generate")({
  validateSearch: (search: Record<string, unknown>) => ({
    classroomId: (search.classroomId as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Generate teaching content — TeachAI" },
      {
        name: "description",
        content:
          "Choose syllabus topics, add references and generate lesson plans, slides, notes and AI lectures.",
      },
      { property: "og:title", content: "Generate teaching content — TeachAI" },
      {
        property: "og:description",
        content: "A guided AI workflow that turns your syllabus into ready-to-teach material.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GeneratePage,
});

// Steps: Topics → Duration → References → Outputs  (Classroom step removed)
const steps = ["Topics", "Duration", "References", "Outputs"] as const;

// Removed "pdf" and "script" from output options
const outputOptions: ContentKind[] = [
  "teaching-plan",
  "ppt",
  "notes",
  "video",
];

const referenceKinds: { kind: ReferenceKind; label: string; icon: typeof Globe }[] = [
  { kind: "book", label: "Book / paper", icon: BookMarked },
  { kind: "website", label: "Website", icon: Globe },
  { kind: "youtube", label: "YouTube", icon: Youtube },
];

function GeneratePage() {
  const { classroomId } = Route.useSearch();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [duration, setDuration] = useState(45);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [refKind, setRefKind] = useState<ReferenceKind>("book");
  const [refValue, setRefValue] = useState("");
  const [outputs, setOutputs] = useState<ContentKind[]>(["teaching-plan"]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);

  const syllabus = useQuery({
    queryKey: ["syllabus", classroomId],
    queryFn: () => syllabusService.get(classroomId),
    enabled: Boolean(classroomId),
  });

  const canContinue = useMemo(() => {
    if (step === 0) return topicIds.length > 0;
    if (step === 3) return outputs.length > 0;
    return true;
  }, [step, topicIds, outputs]);

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addReference() {
    const label = refValue.trim();
    if (!label) return;
    setReferences((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind: refKind, label },
    ]);
    setRefValue("");
  }

  async function submit() {
    setRunning(true);
    setError(null);
    try {
      const response = await generationService.start({
        classroomId,
        topicIds,
        durationMinutes: duration,
        references,
        outputs,
      });
      // The backend now returns { success, generatedCount, materials }
      const data = response as any;
      if (data.materials && data.materials.length > 0) {
        setResults(data.materials);
      } else {
        setError("No content was generated. Please try again.");
      }
    } catch (err: any) {
      setError(
        err?.message?.includes('GEMINI_API_KEY')
          ? "The AI service is not configured. Check that GEMINI_API_KEY is set in the backend .env file."
          : err?.message?.includes('fetch') || err?.message?.includes('connect')
          ? "Could not reach the backend server. Make sure it is running."
          : err?.message || "Generation failed. Please try again."
      );
    } finally {
      setRunning(false);
    }
  }

  // Show results screen after successful generation
  if (results && results.length > 0) {
    return (
      <>
        <PageHeader
          title="Content Generated!"
          description={`Successfully generated content for ${results.length} topic${results.length > 1 ? 's' : ''}.`}
          crumbs={[
            { label: "Faculty", to: "/faculty" },
            { label: "Classrooms", to: "/faculty/classrooms" },
            ...(classroomId ? [{ label: "Classroom", to: `/faculty/classrooms/${classroomId}` }] : []),
            { label: "Generated Content" },
          ]}
        />
        <div className="space-y-4">
          {results.map((material) => (
            <div key={material.topicId} className="panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{material.topicTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[material.teaching_plan && 'Teaching Plan', material.notes && 'Notes', material.slides?.length > 0 && `${material.slides.length} Slides`]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                  Draft
                </span>
              </div>

              {material.notes && (
                <div className="mt-4 rounded-xl border border-border bg-elevated/60 p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">NOTES PREVIEW</p>
                  <div className="text-sm text-foreground whitespace-pre-wrap font-mono">{material.notes.substring(0, 600)}{material.notes.length > 600 ? '...' : ''}</div>
                </div>
              )}

              {material.slides && material.slides.length > 0 && (
                <div className="mt-3 rounded-xl border border-border bg-elevated/60 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">PPT PREVIEW ({material.slides.length} SLIDES)</p>
                  <div className="space-y-1">
                    {material.slides.slice(0, 4).map((slide: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Presentation className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-foreground">{slide.title}</span>
                      </div>
                    ))}
                    {material.slides.length > 4 && (
                      <p className="text-xs text-muted-foreground pl-5">+{material.slides.length - 4} more slides</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => navigate({ to: `/faculty/classrooms/${classroomId}` })}>
              View in Classroom
            </Button>
            <Button variant="outline" onClick={() => { setResults(null); setStep(0); setTopicIds([]); setOutputs(['teaching-plan']); }}>
              Generate More
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Generate content"
        description="Choose topics, set session length, add references and select what to generate."
        crumbs={[
          { label: "Faculty", to: "/faculty" },
          { label: "Classrooms", to: "/faculty/classrooms" },
          ...(classroomId
            ? [{ label: "Classroom", to: `/faculty/classrooms/${classroomId}` }]
            : []),
          { label: "Generate content" },
        ]}
      />

      <ol className="mb-8 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                i === step
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : i < step
                    ? "border-border bg-elevated text-muted-foreground hover:text-foreground"
                    : "border-dashed border-border text-muted-foreground/70",
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px]">
                {i < step ? <Check className="h-3 w-3 text-primary" /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="panel p-6">
        {/* Step 0 — Topics */}
        {step === 0 ? (
          syllabus.data && syllabus.data.length > 0 ? (
            <div className="space-y-6">
              {syllabus.data.map((unit) => (
                <div key={unit.id}>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{unit.title}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {unit.topics.map((topic) => (
                      <label
                        key={topic.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-elevated/60 px-4 py-3 text-sm transition-colors hover:border-primary/40"
                      >
                        <Checkbox
                          checked={topicIds.includes(topic.id)}
                          onCheckedChange={() => toggle(topicIds, topic.id, setTopicIds)}
                        />
                        <span>{topic.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No syllabus topics found"
              description="Add or upload a syllabus for this classroom, then come back to select topics."
            />
          )
        ) : null}

        {/* Step 1 — Duration */}
        {step === 1 ? (
          <div className="max-w-lg">
            <Label>Session duration</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Pacing, slide count and script length are scaled to this length.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <Slider
                value={[duration]}
                min={15}
                max={180}
                step={5}
                onValueChange={([value]) => setDuration(value ?? 45)}
                className="flex-1"
              />
              <span className="w-20 shrink-0 rounded-xl border border-border bg-elevated px-3 py-2 text-center text-sm font-medium">
                {duration} min
              </span>
            </div>
          </div>
        ) : null}

        {/* Step 2 — References */}
        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <Label>Reference material (optional)</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Ground the output in your own sources — books, links, videos or uploaded files.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={refKind} onValueChange={(v) => setRefKind(v as ReferenceKind)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {referenceKinds.map((r) => (
                    <SelectItem key={r.kind} value={r.kind}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={refValue}
                onChange={(e) => setRefValue(e.target.value)}
                placeholder={refKind === "book" ? "Title and author" : "Paste a URL"}
                className="max-w-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addReference();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addReference}>
                <Link2 className="mr-2 h-4 w-4" /> Add
              </Button>
              <Button type="button" variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" /> Upload file
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setReferences((prev) => [
                        ...prev,
                        ...files.map((f) => ({
                          id: crypto.randomUUID(),
                          kind: "file" as ReferenceKind,
                          label: f.name,
                          detail: `${Math.round(f.size / 1024)} KB`,
                        })),
                      ]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </Button>
            </div>

            {references.length > 0 ? (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {references.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Badge variant="secondary" className="capitalize">
                      {r.kind}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    {r.detail ? (
                      <span className="text-xs text-muted-foreground">{r.detail}</span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setReferences((prev) => prev.filter((item) => item.id !== r.id))
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No references added — the AI will work from the syllabus topics alone.
              </p>
            )}
          </div>
        ) : null}

        {/* Step 3 — Outputs */}
        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <Label>What should be generated?</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick one or more outputs. Everything lands in Materials as a draft first.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {outputOptions.map((kind) => {
                const meta = kindMeta[kind];
                const active = outputs.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggle(outputs, kind, setOutputs)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all",
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-border bg-elevated/60 hover:border-primary/30",
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                      <meta.icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-sm font-medium">{meta.label}</span>
                    {active ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>

            {running ? (
              <div className="rounded-2xl border border-border bg-elevated/60 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Preparing your generation request…
                </div>
                <Progress value={40} />
              </div>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canContinue || running}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
