"use client";

import { Toaster as Sonner } from "sonner";

import { useI18n } from "@/lib/i18n/client";

function Toaster() {
  const { dir } = useI18n();
  return (
    <Sonner
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-popover !text-popover-foreground !shadow-lg !font-sans",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
        },
      }}
    />
  );
}

export { Toaster };
