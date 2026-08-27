import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/faculty/subjects/")({
  head: () => ({
    meta: [
      { title: "My Subjects — TeachGen AI" },
      { name: "description", content: "Create and manage the subjects you teach in TeachGen AI." },
      { property: "og:title", content: "My Subjects — TeachGen AI" },
      { property: "og:description", content: "Manage subjects, syllabi and generated e-content." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", department: "", semester: "" });

  const subjects = useQuery({
    queryKey: ["subjects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("teachai_token");
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create subject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Subject created.");
      setOpen(false);
      setForm({ name: "", code: "", department: "", semester: "" });
      void qc.invalidateQueries({ queryKey: ["subjects"] });
      void qc.invalidateQueries({ queryKey: ["faculty-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="My Subjects"
        description="Each subject holds its syllabus, extracted units and topics, and generated e-content."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sname">Subject name</Label>
                  <Input
                    id="sname"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Data Structures"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scode">Course code</Label>
                    <Input
                      id="scode"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="CS201"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ssem">Semester</Label>
                    <Input
                      id="ssem"
                      value={form.semester}
                      onChange={(e) => setForm({ ...form, semester: e.target.value })}
                      placeholder="Semester 3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sdept">Department</Label>
                  <Input
                    id="sdept"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending || !form.name.trim() || !form.code.trim()}
                >
                  {create.isPending && <Loader2 className="size-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {subjects.isLoading ? (
        <div className="panel flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading subjects…
        </div>
      ) : subjects.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.data.map((s: any) => (
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
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          No subjects yet. Create one to upload its syllabus.
        </div>
      )}
    </>
  );
}
