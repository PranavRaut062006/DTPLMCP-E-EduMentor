import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classroomService, NotConnectedError } from "@/services";

export const Route = createFileRoute("/student/join")({
  head: () => ({
    meta: [
      { title: "Join a classroom — TeachAI" },
      {
        name: "description",
        content: "Enter the class code your teacher gave you to join their classroom on TeachAI.",
      },
      { property: "og:title", content: "Join a classroom — TeachAI" },
      { property: "og:description", content: "One code is all you need to start learning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentJoin,
});

function StudentJoin() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await classroomService.join(code.trim().toUpperCase());
      navigate({ to: "/student" });
    } catch (error) {
      setMessage(
        error instanceof NotConnectedError
          ? "Joining isn't available yet — this class code can't be checked right now."
          : "We couldn't find a classroom with that code. Please check it and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Join a classroom"
        description="Your teacher shares a short class code. Enter it below to get access to their lessons."
        crumbs={[{ label: "Student", to: "/student" }, { label: "Join classroom" }]}
      />

      <form onSubmit={submit} className="panel max-w-md p-6">
        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <Label htmlFor="code">Class code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 7KQ2XM"
            autoComplete="off"
            className="tracking-[0.35em] uppercase"
            required
          />
        </div>
        {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" className="mt-6 w-full" disabled={busy || code.trim().length === 0}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Join classroom
        </Button>
      </form>
    </>
  );
}
