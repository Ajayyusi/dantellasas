"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Chip input for free-form tags: Enter or comma adds, Backspace on an empty
 * input removes the last chip. Suggestions (existing tags) show while typing.
 */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder,
  max = 20,
  autoFocus,
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,+$/, "").slice(0, 30);
    setDraft("");
    if (!tag || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  };
  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));

  const q = draft.trim().toLowerCase();
  const matches = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q) && !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6)
    : [];
  const exact = matches.some((m) => m.toLowerCase() === q);

  return (
    <div className="grid gap-1.5">
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-card px-2 py-1 shadow-sm",
          "focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-ring/40",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-0.5 ps-2 pe-1 text-xs font-medium text-primary">
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => remove(tag)}
              className="rounded-full p-0.5 hover:bg-primary/15"
              aria-label={t("clients.form.removeTag", { tag })}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              remove(value[value.length - 1]!);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/80"
        />
      </div>
      {q && (matches.length > 0 || !exact) ? (
        <div className="flex flex-wrap gap-1">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(m)}
              className="rounded-full border px-2 py-0.5 text-xs hover:bg-accent"
            >
              {m}
            </button>
          ))}
          {!exact ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(draft)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
            >
              <PlusIcon className="size-3" />
              {t("clients.form.addTag", { tag: draft.trim() })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
