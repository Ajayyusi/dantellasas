import { cn } from "@/lib/utils";

/**
 * Status pill tinted from any CSS colour (e.g. `var(--status-booked)`): a
 * dot in the full colour on a soft wash, with text mixed for contrast.
 */
export function StatusPill({
  color,
  children,
  className,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-xs font-semibold leading-5 tracking-normal",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 13%, var(--card))`,
        borderColor: `color-mix(in oklch, ${color} 22%, transparent)`,
        color: `color-mix(in oklch, ${color} 72%, var(--foreground))`,
      }}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}
