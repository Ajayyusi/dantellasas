"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { minorToInput, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Currency input working in minor units; shows the currency code as an adornment. */
export function MoneyInput({
  value,
  onChange,
  currency = "AED",
  id,
  className,
  invalid,
  disabled,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (minor: number) => void;
  currency?: string;
  id?: string;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(minorToInput(value));
  const [lastValue, setLastValue] = useState(value);
  // Follow changes made by the parent (adjusting state during render, not in an effect).
  if (value !== lastValue) {
    setLastValue(value);
    if (toMinor(text) !== value) setText(minorToInput(value));
  }
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        {currency}
      </span>
      <Input
        id={id}
        inputMode="decimal"
        dir="ltr"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.]/g, "");
          setText(v);
          setLastValue(toMinor(v || "0"));
          onChange(toMinor(v || "0"));
        }}
        onBlur={() => setText(minorToInput(toMinor(text || "0")))}
        className="ps-12 text-end tabular rtl:text-start"
      />
    </div>
  );
}
