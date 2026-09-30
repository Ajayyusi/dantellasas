import { cn } from "@/lib/utils";

/**
 * Status pill: a dot in the status colour and a readable label on a quiet
 * neutral pill. `color` is any CSS colour (e.g. `var(--status-booked)`);
 * `textColor` defaults to that colour darkened toward the ink for contrast.
 */
export function StatusPill({
  color,
  textColor,
  children,
  className,
}: {
  color: string;
  textColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 font-sans text-xs font-semibold leading-5 tracking-normal",
        className,
      )}
      style={{ color: textColor ?? `color-mix(in oklch, ${color} 62%, var(--foreground))` }}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}
