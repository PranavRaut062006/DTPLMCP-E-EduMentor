import { useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, Library, Sparkles, Users, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MaterialRow } from "@/components/faculty/MaterialRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classroomService, materialService, syllabusService, NotConnectedError } from "@/services";

export const Route = createFileRoute("/faculty/classrooms/$id")({
  head: () => ({
    meta: [
      { title: "Classroom overview — TeachAI" },
      { name: "description", content: "Syllabus, students and generated material for this classroom." },
      { property: "og:title", content: "Classroom overview — TeachAI" },
      { property: "og:description", content: "Manage a single classroom in TeachAI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassroomDetail,
});

function ClassroomDetail() {
  const { id } = useParams({ from: "/faculty/classrooms/$id" });
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const classroom = useQuery({
    queryKey: ["classroom", id],
    queryFn: () => classroomService.detail(id),
  });
  const students = useQuery({
    queryKey: ["classroom", id, "students"],
    queryFn: () => classroomService.students(id),
  });
  const materials = useQuery({
    queryKey: ["materials", id],
    queryFn: () => materialService.list({ classroomId: id }),
  });
  const syllabus = useQuery({
    queryKey: ["syllabus", id],
    queryFn: () => syllabusService.get(id),
  });

  const uploadSyllabus = useMutation({
    mutationFn: (file: File) => syllabusService.uploadPdf(id, file),
    onSuccess: (result) => {
      toast.success(`PDF parsed! Extracted ${result.units.length} units and ${result.totalTopics} topics.`);
      void queryClient.invalidateQueries({ queryKey: ["syllabus", id] });
    },
    onError: (err) => {
      toast.error(
        err instanceof NotConnectedError
          ? "The backend is not connected. Start the backend server first."
          : err.message || "PDF upload failed — please try again.",
      );
    },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = file.type === "application/pdf" || file.name.endsWith(".pdf");
      if (!isValid) {
        toast.error("Only PDF files are supported for automatic parsing.");
      } else {
        toast.info("Extracting syllabus topics, this may take a moment...");
        uploadSyllabus.mutate(file);
      }
    }
    e.target.value = "";
  }

  if (classroom.isLoading) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  if (!classroom.data) {
    return (
      <>
        <PageHeader
          title="Classroom"
          crumbs={[{ label: "Faculty", to: "/faculty" }, { label: "Classrooms", to: "/faculty/classrooms" }, { label: "Detail" }]}
        />
        <EmptyState
          icon={Library}
          title="Classroom details unavailable"
          description="This classroom could not be loaded. Connect the backend to see live classroom data."
          secondary={
            <Button variant="outline" asChild>
              <Link to="/faculty/classrooms">Back to classrooms</Link>
            </Button>
          }
        />
      </>
    );
  }

  const c = classroom.data;

  return (
    <>
      <PageHeader
        title={c.name}
        description={c.description}
        crumbs={[
          { label: "Faculty", to: "/faculty" },
          { label: "Classrooms", to: "/faculty/classrooms" },
          { label: c.name },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadSyllabus.isPending}>
              {uploadSyllabus.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {uploadSyllabus.isPending ? "Extracting..." : "Import Syllabus PDF"}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={handleFile}
              onClick={(e) => e.stopPropagation()}
            />
            <Button asChild disabled={uploadSyllabus.isPending}>
              {/* Pass classroomId as search param so the Generate page skips the classroom step */}
              <Link to="/faculty/generate" search={{ classroomId: id }}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate content
              </Link>
            </Button>
          </>
        }
      />

      <div className="panel mb-8 flex flex-wrap items-center gap-6 p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Class code</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(c.classCode);
              toast.success("Class code copied");
            }}
            className="mt-1 flex items-center gap-2 font-mono text-lg text-primary"
          >
            {c.classCode} <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Subject</p>
          <p className="mt-1 text-sm font-medium">{c.subject}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Students</p>
          <p className="mt-1 text-sm font-medium">{c.studentCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Materials</p>
          <p className="mt-1 text-sm font-medium">{c.materialCount}</p>
        </div>
      </div>

      <Tabs defaultValue="syllabus">
        <TabsList>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="content">Generated Content</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="syllabus" className="mt-6">
          {syllabus.data && syllabus.data.length > 0 ? (
            <div className="space-y-3">
              {syllabus.data.map((unit, i) => (
                <div key={unit.id} className="panel p-5">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Unit {i + 1}</Badge>
                    <p className="text-sm font-semibold">{unit.title}</p>
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {unit.topics.map((t) => (
                      <li key={t.id} className="rounded-lg bg-elevated px-3 py-2 text-sm text-muted-foreground">
                        {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No syllabus added"
              description="Upload a syllabus document to automatically extract units and topics."
              secondary={
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploadSyllabus.isPending}>
                  {uploadSyllabus.isPending ? "Extracting..." : "Import Syllabus PDF"}
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          {materials.data && materials.data.length > 0 ? (
            <div className="panel divide-y divide-border overflow-hidden">
              {materials.data.map((m) => (
                <MaterialRow key={m.id} material={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Library}
              title="No content generated yet"
              description='Click "Generate content" above to create teaching plans, slides, notes and AI lectures.'
              secondary={
                <Button asChild>
                  <Link to="/faculty/generate" search={{ classroomId: id }}>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate content
                  </Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          {students.data && students.data.length > 0 ? (
            <div className="panel divide-y divide-border overflow-hidden">
              {students.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <Badge variant="secondary">Enrolled</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No students enrolled"
              description={`Share the class code ${c.classCode} so students can join this classroom.`}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
