import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

/**
 * Entrance animation in pure CSS, so content is visible before any JavaScript
 * runs. `load` plays on page load (above the fold); otherwise it plays as the
 * element scrolls into view where the browser supports scroll timelines.
 */
export function Reveal({
  children,
  delay = 0,
  load = false,
  className,
}: {
  children: ReactNode;
  delay?: number;
  load?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx(load ? "reveal-load" : "reveal-scroll", className)} style={{ "--d": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  );
}
