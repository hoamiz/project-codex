import {
  layoutError,
  type BrickLayout,
  type BrickCatalog,
} from '../../../../api/src/services/brick-geometry';
export * from '../../../../api/src/services/brick-geometry';
export const DRAFT_KEY = 'project-codex:brick-playground:v1';
export interface BrickHistory {
  past: BrickLayout[];
  present: BrickLayout;
  future: BrickLayout[];
}
export const historyOf = (layout: BrickLayout): BrickHistory => ({
  past: [],
  present: layout,
  future: [],
});
/** Một command ghi layout cuối đã settle; preview, selection và no-op không tạo history. */
export function commitHistory(history: BrickHistory, layout: BrickLayout): BrickHistory {
  if (JSON.stringify(history.present) === JSON.stringify(layout)) return history;
  return { past: [...history.past, history.present].slice(-50), present: layout, future: [] };
}
export function undo(history: BrickHistory): BrickHistory {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redo(history: BrickHistory): BrickHistory {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present].slice(-50),
    present: history.future[0],
    future: history.future.slice(1),
  };
}
/** Dữ liệu local có thể hỏng hoặc cũ: chỉ phục hồi layout hợp lệ, không tin JSON đã parse. */
export function parseDraft(raw: string | null, catalog: BrickCatalog): BrickLayout | null {
  try {
    const value: unknown = JSON.parse(raw || 'null');
    return layoutError(value, catalog) ? null : (value as BrickLayout);
  } catch {
    return null;
  }
}
