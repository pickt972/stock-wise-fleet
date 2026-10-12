export type DropIntent = "before" | "nest" | "after";
export interface HierarchyItem { id: string; parent_id: string | null }

export function dropIntentAt(y: number, top: number, height: number): DropIntent {
  const ratio = (y - top) / height;
  return ratio < 0.3 ? "before" : ratio < 0.7 ? "nest" : "after";
}

export function canDropCategory(items: HierarchyItem[], activeId: string, targetId: string, intent: DropIntent): boolean {
  const active = items.find((item) => item.id === activeId);
  const target = items.find((item) => item.id === targetId);
  if (!active || !target || activeId === targetId) return false;
  const parentId = intent === "nest" ? target.id : target.parent_id;
  const seen = new Set<string>();
  let ancestor = parentId;
  while (ancestor) {
    if (ancestor === activeId || seen.has(ancestor)) return false;
    seen.add(ancestor);
    ancestor = items.find((item) => item.id === ancestor)?.parent_id ?? null;
  }
  if (!parentId) return true;
  const parent = items.find((item) => item.id === parentId);
  // Only roots may accept children; moving a subtree under a root creates level three.
  return !!parent && !parent.parent_id && !items.some((item) => item.parent_id === activeId);
}

export function edgeScrollSpeed(y: number, top: number, bottom: number): number {
  if (y < top || y > bottom) return 0;
  if (y < top + 80) return -Math.ceil(12 * (1 - (y - top) / 80));
  if (y > bottom - 80) return Math.ceil(12 * (1 - (bottom - y) / 80));
  return 0;
}