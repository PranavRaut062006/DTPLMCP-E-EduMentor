import type { LectureContent, PptContent } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="text-xs font-semibold tracking-widest text-primary uppercase">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-primary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LectureView({ lecture }: { lecture: LectureContent }) {
  return (
    <div className="panel p-6">
      <h2 className="font-display text-xl font-semibold">{lecture.title}</h2>
      <Section title="Learning objectives">
        <Bullets items={lecture.learningObjectives} />
      </Section>
      <Section title="Introduction">
        <p className="whitespace-pre-wrap">{lecture.introduction}</p>
      </Section>
      <Section title="Concept explanation">
        <p className="whitespace-pre-wrap">{lecture.conceptExplanation}</p>
      </Section>
      <Section title="Important points">
        <Bullets items={lecture.importantPoints} />
      </Section>
      <Section title="Examples">
        <Bullets items={lecture.examples} />
      </Section>
      <Section title="Applications">
        <Bullets items={lecture.applications} />
      </Section>
      <Section title="Summary">
        <p className="whitespace-pre-wrap">{lecture.summary}</p>
      </Section>
      <Section title="Important questions">
        <Bullets items={lecture.importantQuestions} />
      </Section>
      {lecture.syllabusGaps && (
        <p className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <span className="font-semibold">Syllabus note: </span>
          {lecture.syllabusGaps}
        </p>
      )}
    </div>
  );
}

export function PptView({ ppt }: { ppt: any }) {
  const slides = Array.isArray(ppt) ? ppt : ppt?.slides || [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {slides.map((slide: any, i: number) => {
        const points = slide.bullets || slide.points || [];
        const notes = slide.script || slide.notes || "";
        return (
          <div key={i} className="panel flex flex-col p-5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Slide {i + 1}
            </p>
            <p className="mt-1 font-semibold">{slide.title}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm marker:text-primary">
              {points.map((p: string, j: number) => (
                <li key={j}>{p}</li>
              ))}
            </ul>
            {notes && (
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="font-semibold">Speaker notes: </span>
                {notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
