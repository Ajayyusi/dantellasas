"use client";

import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Toaster as Sonner } from "sonner";

import { useI18n } from "@/lib/i18n/client";

function Toaster() {
  const { dir } = useI18n();
  return (
    <Sonner
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      closeButton
      gap={10}
      // Clears the phone/tablet bottom tab bar; see --toast-offset-bottom in globals.css.
      offset={{ bottom: "var(--toast-offset-bottom)" }}
      mobileOffset={{ bottom: "var(--toast-offset-bottom)" }}
      icons={{
        success: <CheckCircle2Icon className="size-5 text-success" />,
        error: <XCircleIcon className="size-5 text-destructive" />,
        warning: <AlertTriangleIcon className="size-5 text-warning" />,
        info: <InfoIcon className="size-5 text-info" />,
        loading: <Loader2Icon className="size-5 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!gap-3 !rounded-2xl !border !border-border !bg-popover !px-4 !py-3.5 !text-popover-foreground !shadow-lg !font-sans !text-sm",
          title: "!font-semibold",
          description: "!text-muted-foreground",
          actionButton: "!rounded-lg !bg-primary !text-primary-foreground !font-semibold",
          closeButton: "!border-border !bg-card !text-muted-foreground hover:!text-foreground",
        },
      }}
    />
  );
}

export { Toaster };
