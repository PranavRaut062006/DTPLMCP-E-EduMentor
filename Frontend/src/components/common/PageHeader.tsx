import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string | undefined;
}

export function PageHeader({
  title,
  description,
  crumbs = [],
  actions,
}: {
  title: string;
  description?: string | undefined;
  crumbs?: Crumb[] | undefined;
  actions?: React.ReactNode | undefined;
}) {
  return (
    <div className="mb-8">
      {crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs">
          {crumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
              {i < crumbs.length - 1 ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
