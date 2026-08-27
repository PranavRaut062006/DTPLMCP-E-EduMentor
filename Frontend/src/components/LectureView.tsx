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

import ReactMarkdown from "react-markdown";

export function LectureView({ lecture }: { lecture: any }) {
  if (typeof lecture === 'string') {
    return (
      <div className="panel p-6 prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{lecture}</ReactMarkdown>
      </div>
    );
  }

  // Fallback for old JSON format
  return (
    <div className="panel p-6 prose prose-sm max-w-none dark:prose-invert">
      <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(lecture, null, 2)}</pre>
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
            <div className="flex justify-between items-start mb-1">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Slide {i + 1}
              </p>
              {slide.layout && (
                <span className="text-[10px] font-semibold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                  {slide.layout.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="font-semibold">{slide.title}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm marker:text-primary">
              {points.map((p: string, j: number) => (
                <li key={j}>{p}</li>
              ))}
            </ul>
            {slide.layout === "image_right" && slide.visualPrompt && (
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg text-xs">
                <span className="font-semibold text-primary">🖼️ AI Image Prompt: </span>
                <span className="text-muted-foreground italic">{slide.visualPrompt}</span>
              </div>
            )}
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
