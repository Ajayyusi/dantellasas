"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const toText = (bps: number) => (bps / 100).toString();
const toBps = (text: string) => {
  const n = Number(text);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n)) * 100) : 0;
};

/** Percentage input working in basis points (10% = 1000). Accepts up to two decimals. */
export function PercentInput({
  value,
  onChange,
  id,
  className,
  invalid,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (bps: number) => void;
  id?: string;
  className?: string;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(toText(value));
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    if (toBps(text) !== value) setText(toText(value));
  }
  return (
    // The whole control is LTR so the % sign and padding stay on the same side in Arabic.
    <div dir="ltr" className={cn("relative", className)}>
      <Input
        id={id}
        inputMode="decimal"
        value={text}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.]/g, "");
          setText(v);
          const bps = toBps(v || "0");
          setLast(bps);
          onChange(bps);
        }}
        onBlur={() => setText(toText(toBps(text || "0")))}
        className="pe-8 text-end tabular"
      />
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        %
      </span>
    </div>
  );
}
