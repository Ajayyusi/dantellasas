import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form field layout: label, control, hint and error. The control receives the
 * id through `htmlFor`; errors are announced via aria-describedby.
 */
function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
  labelAction,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: React.ReactNode;
  labelAction?: React.ReactNode;
}) {
  const describedBy = htmlFor ? `${htmlFor}-desc` : undefined;
  return (
    <div className={cn("grid gap-2", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor} className="text-[14px] font-semibold text-foreground/90">
            {label}
            {required ? <span className="text-destructive" aria-hidden>*</span> : null}
            {optionalLabel ? <span className="font-normal text-muted-foreground">({optionalLabel})</span> : null}
          </Label>
          {labelAction}
        </div>
      ) : null}
      {children}
      {error ? (
        <p id={describedBy} role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-destructive animate-fade-up">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-[14px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-5 sm:grid-cols-2", className)} {...props} />;
}

function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-5", className)}>
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? <p className="mt-1 text-[14px] text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export { Field, FieldGroup, FormSection };
