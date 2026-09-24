import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Presentation, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ClassroomCard } from "@/components/faculty/ClassroomCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { classroomService, NotConnectedError } from "@/services";

export const Route = createFileRoute("/faculty/classrooms/")({
  head: () => ({
    meta: [
      { title: "Classrooms — TeachAI" },
      { name: "description", content: "Create and manage the classrooms you teach with TeachAI." },
      { property: "og:title", content: "Classrooms — TeachAI" },
      { property: "og:description", content: "Manage classrooms, class codes and enrolled students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassroomsPage,
});

function ClassroomsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    department: "",
    academicYear: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: classroomService.list });

  const create = useMutation({
    mutationFn: () => classroomService.create(form),
    onSuccess: () => {
      toast.success("Classroom created");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["classrooms"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof NotConnectedError
          ? "Classroom saving needs the backend to be connected."
          : error instanceof Error
            ? error.message
            : "Could not create the classroom.",
      );
    },
  });

  const deleteClassroom = useMutation({
    mutationFn: (id: string) => classroomService.delete(id),
    onSuccess: () => {
      toast.success("Classroom deleted");
      void qc.invalidateQueries({ queryKey: ["classrooms"] });
    },
    onError: () => toast.error("Could not delete the classroom."),
  });

  const filtered = (classrooms.data ?? []).filter((c) =>
    `${c.name} ${c.subject}`.toLowerCase().includes(query.toLowerCase()),
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next['name'] = "Give the classroom a name.";
    if (form.subject.trim().length < 2) next['subject'] = "Subject is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate();
  }

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New classroom
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create classroom</DialogTitle>
          <DialogDescription>
            Students join with the class code generated for this classroom.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Classroom name</Label>
            <Input
              id="name"
              placeholder="Data Structures — Sem 3"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors['name'] ? <p className="text-xs text-destructive">{errors['name']}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Computer Science"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              {errors['subject'] ? <p className="text-xs text-destructive">{errors['subject']}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Academic year</Label>
              <Input
                id="year"
                placeholder="2026–27"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              placeholder="School of Engineering"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="What this course covers…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Create classroom
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <PageHeader
        title="Classrooms"
        description="Every course you teach, with its syllabus, students and generated material."
        crumbs={[{ label: "Faculty", to: "/faculty" }, { label: "Classrooms" }]}
        actions={dialog}
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder="Search classrooms"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {classrooms.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClassroomCard key={c.id} classroom={c} onDelete={(id) => deleteClassroom.mutate(id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Presentation}
          title={query ? "No matching classrooms" : "No classrooms yet"}
          description={
            query
              ? "Try a different search term."
              : "Create a classroom, upload its syllabus, and start generating teaching content."
          }
          secondary={query ? undefined : dialog}
        />
      )}
    </>
  );
}
