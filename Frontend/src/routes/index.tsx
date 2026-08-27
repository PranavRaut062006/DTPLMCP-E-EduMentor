import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileUp, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeachGen AI — Create Faculty E-Content Faster with AI" },
      {
        name: "description",
        content:
          "Transform your official syllabus into structured lecture content and presentation material, with faculty review and approval at every step.",
      },
      { property: "og:title", content: "TeachGen AI — Create Faculty E-Content Faster with AI" },
      {
        property: "og:description",
        content: "Syllabus-grounded lecture notes and slide outlines, reviewed and approved by faculty.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: FileUp,
    title: "Upload Syllabus",
    body: "Upload the official syllabus PDF. TeachGen extracts the text and builds the unit and topic structure from your document.",
  },
  {
    icon: Sparkles,
    title: "Generate E-Content",
    body: "Pick a topic and generate structured lecture notes and a slide outline grounded strictly in the syllabus context.",
  },
  {
    icon: CheckCircle2,
    title: "Review & Publish",
    body: "Edit, regenerate and approve. Nothing reaches students until you publish it yourself.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">TeachGen AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth" search={{ mode: "login" }}>
                Login
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "register" }}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-1 text-xs font-semibold tracking-wide text-accent-foreground uppercase">
              Phase 1 · Faculty e-content workspace
            </span>
            <h1 className="mt-6 text-4xl leading-tight font-semibold sm:text-5xl">
              Create Faculty E-Content Faster with AI
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Transform your official syllabus into structured lecture content and presentation material,
              with faculty review and approval at every step.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "register" }}>
                  Get Started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "login" }}>
                  Login
                </Link>
              </Button>
            </div>
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Content pipeline
            </p>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Syllabus PDF uploaded",
                "Units and topics extracted",
                "Lecture content generated",
                "Slide outline generated",
                "Faculty review and edits",
                "Approved & published to students",
              ].map((row, i) => (
                <li key={row} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  {row}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-xl border border-border bg-surface p-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">
                {i + 1}. {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="panel p-8 sm:p-10">
          <h2 className="text-2xl font-semibold">For Faculty</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Generate structured teaching content from your syllabus while keeping complete control over the
            final material. Every draft stays private until you approve and publish it to the student portal.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ mode: "register" }}>
              Create a faculty account
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <p className="text-center text-sm text-muted-foreground">
          TeachGen AI · Faculty e-content generation platform
        </p>
      </footer>
    </div>
  );
}
