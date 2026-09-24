import { Logo } from "@/components/brand/Logo";

const columns = [
  { title: "Product", links: ["Features", "How it works", "Capabilities"] },
  { title: "Company", links: ["About", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo showTagline />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            An AI content generator and mentor built for classrooms — from syllabus to published
            learning package.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-foreground">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} TeachAI. All rights reserved.</p>
          <p>Turn your syllabus into intelligent learning.</p>
        </div>
      </div>
    </footer>
  );
}
