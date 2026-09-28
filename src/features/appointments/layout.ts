/**
 * Pure calendar geometry: overlapping events in one column are laid out side
 * by side (classic interval-graph column packing).
 */
export interface Interval {
  id: string;
  start: number; // minutes since midnight
  end: number;
}

export interface Placed extends Interval {
  column: number;
  columns: number;
}

export function packColumns<T extends Interval>(items: T[]): (T & { column: number; columns: number })[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: (T & { column: number; columns: number })[] = [];
  let cluster: (T & { column: number; columns: number })[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const width = cluster.reduce((m, c) => Math.max(m, c.column + 1), 0);
    cluster.forEach((c) => (c.columns = width));
    out.push(...cluster);
    cluster = [];
  };
  for (const item of sorted) {
    if (item.start >= clusterEnd && cluster.length) {
      flush();
      clusterEnd = -Infinity;
    }
    const used = new Set(cluster.filter((c) => c.end > item.start).map((c) => c.column));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ ...item, column: col, columns: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) flush();
  return out;
}

/** Time slots between start and end (inclusive of start, exclusive of end). */
export function timeSlots(startMin: number, endMin: number, step: number): number[] {
  const out: number[] = [];
  for (let m = startMin; m < endMin; m += step) out.push(m);
  return out;
}

export function snap(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}
