import { cn } from "@/lib/utils";

/**
 * TeachAI mark — a minimal geometric head silhouette with a neural node core.
 * Works standalone as an icon and inline in the navbar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="TeachAI logo"
      className={cn("h-9 w-9", className)}
    >
      <defs>
        <linearGradient id="teachai-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.9 0.13 175)" />
          <stop offset="100%" stopColor="oklch(0.76 0.13 210)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="oklch(0.22 0.02 252)" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        fill="none"
        stroke="oklch(1 0 0 / 0.12)"
      />
      {/* head silhouette */}
      <path
        d="M15 33.5V21.5C15 15.7 19.4 11.5 25.2 11.5C30.9 11.5 35.5 15.9 35.5 21.6C35.5 25.2 33.9 27.4 31.6 29.1C30.4 30 29.9 30.7 29.9 32V36.5H19.6"
        fill="none"
        stroke="url(#teachai-mark)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* neural core */}
      <circle cx="24.6" cy="21.6" r="2.6" fill="url(#teachai-mark)" />
      <path
        d="M24.6 21.6L19.6 17.9M24.6 21.6L30.4 19.4M24.6 21.6L22.6 27.4"
        stroke="url(#teachai-mark)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="19.6" cy="17.9" r="1.5" fill="url(#teachai-mark)" opacity="0.9" />
      <circle cx="30.4" cy="19.4" r="1.5" fill="url(#teachai-mark)" opacity="0.9" />
      <circle cx="22.6" cy="27.4" r="1.5" fill="url(#teachai-mark)" opacity="0.9" />
    </svg>
  );
}

export function Logo({
  className,
  showTagline = false,
  size = "md",
}: {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={size === "sm" ? "h-7 w-7" : "h-9 w-9"} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            size === "sm" ? "text-[15px]" : "text-lg",
          )}
        >
          Teach<span className="accent-gradient-text">AI</span>
        </span>
        {showTagline ? (
          <span className="mt-1 text-[11px] text-muted-foreground">
            Turn your syllabus into intelligent learning.
          </span>
        ) : null}
      </span>
    </span>
  );
}
