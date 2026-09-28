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
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor} className="text-[13px] font-medium">
            {label}
            {required ? <span className="text-destructive" aria-hidden>*</span> : null}
            {optionalLabel ? <span className="font-normal text-muted-foreground">({optionalLabel})</span> : null}
          </Label>
          {labelAction}
        </div>
      ) : null}
      {children}
      {error ? (
        <p id={describedBy} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...props} />;
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
    <section className={cn("grid gap-4", className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export { Field, FieldGroup, FormSection };
