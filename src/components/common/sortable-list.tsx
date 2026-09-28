"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface HandleProps {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
}

function SortableRow<T extends { id: string }>({
  item,
  render,
  disabled,
}: {
  item: T;
  render: (item: T, handle: React.ReactNode, dragging: boolean) => React.ReactNode;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const handle = disabled ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t("common.dragToReorder")}
      className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-foreground/60 outline-none hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-90 shadow-md")}
    >
      {render(item, handle, isDragging)}
    </li>
  );
}

/** Vertical drag-to-reorder list (pointer and keyboard). */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  render,
  disabled,
  className,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  render: (item: T, handle: React.ReactNode, dragging: boolean) => React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to).map((i) => i.id));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableRow key={item.id} item={item} render={render} disabled={disabled} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
