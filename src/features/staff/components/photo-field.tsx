"use client";

import { CameraIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";

import { removeStaffPhotoAction, uploadStaffPhotoAction } from "../actions";

const MAX_MB = 3;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Staff photo. For an existing record the file uploads straight away; for a
 * new one it is held (`onPick`) and uploaded by the form after the record exists.
 */
export function PhotoField({
  staffId,
  name,
  color,
  photoUrl,
  onPick,
  size = "size-16",
}: {
  staffId: string | null;
  name: string;
  color: string;
  photoUrl: string | null;
  onPick?: (file: File | null) => void;
  size?: string;
}) {
  const { t, te } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [pending, setPending] = useState(false);
  const remove = useAction(removeStaffPhotoAction, { success: t("staff.photo.removed"), onSuccess: () => setPreview(null) });

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error(t("errors.fileType"));
    if (file.size > MAX_MB * 1024 * 1024) return void toast.error(t("errors.fileTooLarge", { max: MAX_MB }));
    if (!staffId) {
      setPreview(URL.createObjectURL(file));
      onPick?.(file);
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("staffId", staffId);
      fd.set("file", file);
      const res = await uploadStaffPhotoAction(fd);
      if (res.ok) {
        setPreview(res.data.photoUrl);
        toast.success(t("staff.photo.updated"));
      } else toast.error(res.error === "errors.fileTooLarge" ? t("errors.fileTooLarge", { max: MAX_MB }) : te(res.error));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <PersonAvatar name={name || "?"} src={preview} color={color} className={`${size} text-lg`} />
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? <Loader2Icon className="animate-spin" /> : <CameraIcon />}
            {preview ? t("staff.photo.change") : t("staff.photo.upload")}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || remove.pending}
              onClick={() => {
                if (staffId) void remove.run({ id: staffId });
                else {
                  setPreview(null);
                  onPick?.(null);
                }
              }}
            >
              <Trash2Icon />
              {t("staff.photo.remove")}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t("staff.photo.hint")}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
