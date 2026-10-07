import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalog } from './room-fixture';
import {
  DRAFT_KEY,
  challengeComplete,
  findPlacement,
  footprint,
  historyReducer,
  isRoomLayout,
  loadDraft,
  placementError,
  updateItem,
  type History,
  type RoomLayout,
} from './room-core';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
const starter = () => structuredClone(catalog.starter);

describe('room placement and history', () => {
  it('rejects collisions, off-grid, non-finite and rotated out-of-room placements without changing a draft', () => {
    const layout = starter();
    const bed = layout.items[0];
    expect(isRoomLayout(layout, catalog)).toBe(true);
    expect(updateItem(layout, bed.id, { x: 1, z: -1.25 }, catalog).error).toContain('đang có đồ');
    expect(updateItem(layout, bed.id, { x: 0.1 }, catalog).error).toContain('ô lưới');
    expect(updateItem(layout, bed.id, { x: Infinity }, catalog).layout).toBe(layout);
    expect(updateItem(layout, bed.id, { x: -2, rotation: 90 }, catalog).layout).toBe(layout);
    expect(footprint({ ...bed, rotation: 90 }, catalog)).toEqual([2.05, 1.7]);
    const moved = updateItem(layout, bed.id, { z: 0 }, catalog);
    expect(moved.error).toBeNull();
    expect(layout.items[0].z).toBe(-1.25);
    expect(moved.layout.items[0].z).toBe(0);
  });

  it('finds free cells until no space remains and respects the item limit', () => {
    let layout: RoomLayout = { ...starter(), items: [] };
    for (let i = 0; i < 40; i++) {
      const item = findPlacement('chair', layout, catalog);
      if (!item) break;
      expect(placementError(item, layout.items, catalog)).toBeNull();
      layout = { ...layout, items: [...layout.items, item] };
      expect(isRoomLayout(layout, catalog)).toBe(true);
    }
    expect(layout.items.length).toBe(24);
    expect(findPlacement('plant', layout, catalog)).toBeNull();
    const fullFloor = { ...starter(), items: [] };
    expect(findPlacement('bed', fullFloor, catalog)?.x).toBe(0);
    expect(findPlacement('bed', layout, catalog)).toBeNull();
  });

  it('keeps history bounded and clears redo after a new edit, while ignoring no-op commits', () => {
    let history: History = { past: [], present: starter(), future: [] };
    expect(historyReducer(history, { type: 'undo' })).toBe(history);
    expect(historyReducer(history, { type: 'commit', layout: starter() })).toBe(history);
    for (let i = 0; i < 45; i++)
      history = historyReducer(history, {
        type: 'commit',
        layout: { ...history.present, title: `Room ${i}` },
      });
    expect(history.past).toHaveLength(40);
    const undone = historyReducer(history, { type: 'undo' });
    expect(undone.present.title).toBe('Room 43');
    expect(historyReducer(undone, { type: 'redo' }).present.title).toBe('Room 44');
    const branch = historyReducer(undone, {
      type: 'commit',
      layout: { ...undone.present, title: 'Một nhánh mới' },
    });
    expect(branch.future).toEqual([]);
    expect(historyReducer(branch, { type: 'redo' })).toBe(branch);
  });
});

describe('draft recovery and challenge', () => {
  it('recovers corrupt, unsupported, duplicated, unsafe and overlapping draft data', () => {
    const layout = starter();
    const candidates: unknown[] = [
      null,
      { ...layout, schemaVersion: 2 },
      { ...layout, wallColor: 'url(javascript:alert(1))' },
      { ...layout, items: [layout.items[0], layout.items[0]] },
      { ...layout, items: [{ ...layout.items[0], rotation: '90' }] },
      { ...layout, items: [{ ...layout.items[0], kind: 'unknown' }] },
      { ...layout, items: [{ ...layout.items[0], x: 0.1 }] },
      {
        ...layout,
        items: [
          layout.items[0],
          { ...layout.items[1], x: layout.items[0].x, z: layout.items[0].z },
        ],
      },
    ];
    for (const value of candidates) {
      expect(isRoomLayout(value, catalog)).toBe(false);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      expect(loadDraft(catalog)).toEqual(layout);
    }
    localStorage.setItem(DRAFT_KEY, '{broken');
    expect(loadDraft(catalog)).toEqual(layout);
    const valid = { ...layout, title: 'Nháp của tôi' };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(valid));
    expect(loadDraft(catalog)).toEqual(valid);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadDraft(catalog)).toEqual(layout);
  });

  it('requires desk, chair and lamp with no more than five items for the challenge', () => {
    const layout = starter();
    expect(challengeComplete(layout)).toBe(false);
    const office = {
      ...layout,
      items: layout.items.filter((item) => ['desk', 'chair', 'lamp'].includes(item.kind)),
    };
    expect(challengeComplete(office)).toBe(true);
    expect(
      challengeComplete({ ...office, items: office.items.filter((item) => item.kind !== 'lamp') }),
    ).toBe(false);
  });
});
