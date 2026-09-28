"use client";

import { Loader2Icon, PinIcon, PinOffIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { addClientNoteAction, deleteClientNoteAction, setClientNotePinnedAction } from "../../actions";
import type { ClientNoteView } from "../../types";

export function NoteCard({ note, clientId, editable }: { note: ClientNoteView; clientId: string; editable: boolean }) {
  const { t, te } = useI18n();
  const org = useOrg();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function togglePin() {
    setBusy(true);
    const res = await setClientNotePinnedAction({ clientId, noteId: note.id, pinned: !note.pinned });
    setBusy(false);
    if (res.ok) toast.success(note.pinned ? t("clients.notes.unpinnedToast") : t("clients.notes.pinnedToast"));
    else toast.error(te(res.error));
  }

  return (
    <article
      className={cn(
        "group grid grid-cols-1 gap-2 rounded-xl border bg-card p-4",
        note.pinned && "border-warning/40 bg-[color-mix(in_oklch,var(--warning)_7%,var(--card))]",
      )}
    >
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed" dir="auto">
        {note.body}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {note.pinned ? (
            <span className="inline-flex items-center gap-1 font-medium text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]">
              <PinIcon className="size-3" />
              {t("clients.notes.pinned")}
            </span>
          ) : null}
          <span className="truncate">
            {note.authorName || "—"} · {org.date(note.createdAt, "datetime")}
          </span>
        </span>
        {editable ? (
          <span className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={togglePin} disabled={busy}>
              {busy ? <Loader2Icon className="animate-spin" /> : note.pinned ? <PinOffIcon /> : <PinIcon />}
              {note.pinned ? t("clients.notes.unpin") : t("clients.notes.pin")}
            </Button>
            {note.canDelete ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                aria-label={t("common.delete")}
              >
                <Trash2Icon />
              </Button>
            ) : null}
          </span>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("clients.notes.deleteTitle")}
        description={t("clients.notes.deleteBody")}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={async () => {
          const res = await deleteClientNoteAction({ clientId, noteId: note.id });
          if (res.ok) toast.success(t("clients.notes.deleted"));
          else toast.error(te(res.error));
        }}
      />
    </article>
  );
}

function NoteComposer({ clientId }: { clientId: string }) {
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const { run, pending, errorFor } = useAction(addClientNoteAction, {
    success: t("clients.notes.added"),
    onSuccess: () => {
      setBody("");
      setPinned(false);
    },
  });
  const submit = () => body.trim() && void run({ clientId, body, pinned });

  return (
    <form
      className="grid gap-2 rounded-xl border bg-card p-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        maxLength={2000}
        placeholder={t("clients.notes.placeholder")}
        aria-label={t("clients.notes.add")}
        aria-invalid={!!errorFor("body")}
        className="resize-y border-0 shadow-none focus-visible:ring-0"
        dir="auto"
      />
      {errorFor("body") ? <p className="px-3 text-[13px] text-destructive">{errorFor("body")}</p> : null}
      <div className="flex items-center justify-between gap-3 border-t pt-2">
        <label className="flex items-center gap-2 px-1 text-[13px]">
          <Checkbox checked={pinned} onCheckedChange={(v) => setPinned(!!v)} />
          {t("clients.notes.pinOnAdd")}
        </label>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("clients.notes.add")}
        </Button>
      </div>
    </form>
  );
}

export function NotesTab({ clientId, notes }: { clientId: string; notes: ClientNoteView[] }) {
  const { t } = useI18n();
  const org = useOrg();
  const editable = org.can("edit_customers");
  return (
    <div className="grid max-w-3xl grid-cols-1 gap-3">
      {editable ? <NoteComposer clientId={clientId} /> : <p className="text-[13px] text-muted-foreground">{t("clients.notes.readOnly")}</p>}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed">
          <EmptyState compact icon={StickyNoteIcon} title={t("clients.notes.empty")} description={t("clients.notes.emptyHint")} />
        </div>
      ) : (
        notes.map((n) => <NoteCard key={n.id} note={n} clientId={clientId} editable={editable} />)
      )}
    </div>
  );
}
