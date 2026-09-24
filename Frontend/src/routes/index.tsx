import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Clock,
  FileText,
  GraduationCap,
  Library,
  Mic,
  Presentation,
  Sparkles,
  Upload,
  Video,
  CheckCircle2,
  PencilRuler,
  Send,
} from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeachAI — Turn your syllabus into intelligent learning" },
      {
        name: "description",
        content:
          "TeachAI helps faculty transform syllabi and reference materials into teaching plans, presentations, notes, PDFs and AI-narrated lectures.",
      },
      { property: "og:title", content: "TeachAI — Turn your syllabus into intelligent learning" },
      {
        property: "og:description",
        content:
          "AI-powered academic content generator and mentor for faculty and students.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { title: "Upload Syllabus", icon: Upload, body: "Bring in your official syllabus as a PDF, document, or type it in." },
  { title: "Add References", icon: Library, body: "Attach books, papers, slides, websites, or lecture videos." },
  { title: "Set Teaching Duration", icon: Clock, body: "Tell TeachAI how much classroom time you actually have." },
  { title: "Generate Content", icon: Sparkles, body: "AI builds a teaching plan and every learning asset around it." },
  { title: "Review & Edit", icon: PencilRuler, body: "Refine wording, slides, and timing until it matches your style." },
  { title: "Publish to Students", icon: Send, body: "Release the package to your classroom with one click." },
];

const capabilities = [
  { title: "AI Teaching Plans", icon: BookOpenCheck, body: "Time-boxed session plans mapped to your units and topics." },
  { title: "PPT Generation", icon: Presentation, body: "Clean, structured decks generated per topic and editable slide by slide." },
  { title: "Notes & PDF Generation", icon: FileText, body: "Lecture notes and print-ready PDFs derived from your material." },
  { title: "AI Lecture Generation", icon: Video, body: "Narrated video lectures built from the generated script." },
  { title: "Faculty Voice", icon: Mic, body: "Optional voice profile so lectures sound like you — with explicit consent." },
  { title: "Reference-Based Learning", icon: Library, body: "Content grounded in the references you trust, not the open web." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main>
        {/* Hero */}
        <section className="hero-glow relative overflow-hidden">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI content generator & mentor for classrooms
              </span>
              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Turn your syllabus into <span className="accent-gradient-text">intelligent learning.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                TeachAI helps faculty transform syllabi and reference materials into structured
                teaching plans, presentations, notes, PDFs, and AI-narrated lectures — all within the
                available teaching time.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link to="/signup">
                    Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#capabilities">Explore Platform</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                From syllabus to published package in six steps
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="panel group p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
                      <step.icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="font-display text-sm text-muted-foreground/70">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="border-t border-border bg-surface/30 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                AI capabilities
              </p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                Everything a lecture needs, generated together
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((cap) => (
                <div
                  key={cap.title}
                  className="glass rounded-2xl p-6 transition-all duration-300 hover:border-primary/30"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/60 text-primary">
                    <cap.icon className="h-4.5 w-4.5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{cap.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Faculty / Student */}
        <section className="border-t border-border py-20 sm:py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div id="faculty" className="panel p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
                <BookOpenCheck className="h-5 w-5" />
              </span>
              <h2 className="mt-6 text-2xl font-semibold">For Faculty</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Create classrooms, structure your syllabus into units and topics, and let TeachAI
                build the teaching package that fits the hours you have.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Unit and topic level syllabus management",
                  "Duration-aware teaching plans",
                  "Editable slides, notes, PDFs and scripts",
                  "Review checklist before publishing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-8" asChild>
                <Link to="/signup">Start as Faculty</Link>
              </Button>
            </div>

            <div id="students" className="panel p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
                <GraduationCap className="h-5 w-5" />
              </span>
              <h2 className="mt-6 text-2xl font-semibold">For Students</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Join a classroom with a class code and learn from material published by your own
                faculty — notes, slides, PDFs and narrated lectures in one place.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Join classrooms instantly with a class code",
                  "Notes, decks, PDFs and video lectures",
                  "Follow the faculty teaching plan",
                  "Track topic-by-topic progress",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-8" variant="outline" asChild>
                <Link to="/signup">Start as Student</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
