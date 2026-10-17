import { useCallback, useEffect, useRef, useState } from 'react';
import { stickerIds } from './lessons';
export type StickerId = (typeof stickerIds)[number];
export const rewardsKey = 'project-codex:kids-learning:stickers:v1';
export const stickerNames: Record<StickerId, string> = {
  bee: 'Ong',
  dog: 'Chó',
  cow: 'Bò',
  cat: 'Mèo',
  rabbit: 'Thỏ',
  bear: 'Gấu',
  kangaroo: 'Chuột túi',
  panda: 'Gấu trúc',
  elephant: 'Voi',
  penguin: 'Cánh cụt',
  owl: 'Cú',
  whale: 'Cá voi',
};
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const renamedStickers: Record<string, StickerId> = { fox: 'kangaroo', frog: 'elephant' };

/** Chỉ đọc key/version của PJ7 và ID trong whitelist; dữ liệu hỏng không ảnh hưởng storage của demo khác. Cáo và ếch đã đổi thành chuột túi và voi. */
export function readStickers(raw: string | null): StickerId[] {
  try {
    const parsed = JSON.parse(raw || 'null');
    if (parsed?.version !== 1 || !Array.isArray(parsed.ids)) return [];
    return [
      ...new Set<StickerId>(
        parsed.ids.flatMap((id: unknown) => {
          const next = typeof id === 'string' ? (renamedStickers[id] ?? id) : id;
          return typeof next === 'string' && stickerIds.includes(next as StickerId)
            ? [next as StickerId]
            : [];
        }),
      ),
    ].slice(0, 12);
  } catch {
    return [];
  }
}
/** Giữ round đã thưởng trong phiên, tối đa64 đề gần nhất; không thưởng từ callback animation hoặc lượt vẽ lại. */
export function createRewardBook(storage: Store | null) {
  let ids: StickerId[] = [];
  try {
    ids = readStickers(storage?.getItem(rewardsKey) || null);
  } catch {
    /* Storage bị chặn: dùng bộ sưu tập trong phiên. */
  }
  const rounds: string[] = [];
  return {
    view: () => [...ids],
    award: (roundId: string) => {
      if (rounds.includes(roundId)) return { ids: [...ids], newId: null, saved: true };
      rounds.push(roundId);
      if (rounds.length > 64) rounds.shift();
      const next = stickerIds.find((id) => !ids.includes(id));
      if (!next) return { ids: [...ids], newId: null, saved: true };
      ids = [...ids, next];
      let saved = false;
      try {
        if (storage) {
          storage.setItem(rewardsKey, JSON.stringify({ version: 1, ids }));
          saved = true;
        }
      } catch {
        /* Quota/permission lỗi không mất phần thưởng vừa nhận trong phiên. */
      }
      return { ids: [...ids], newId: next, saved };
    },
  };
}
export function useRewards() {
  const book = useRef<ReturnType<typeof createRewardBook> | null>(null);
  if (!book.current) {
    let store: Storage | null = null;
    try {
      store = localStorage;
    } catch {
      /* Dùng memory khi getter storage bị chặn. */
    }
    book.current = createRewardBook(store);
  }
  const [ids, setIds] = useState(() => book.current!.view());
  const [recent, setRecent] = useState<StickerId | null>(null);
  const [sessionOnly, setSessionOnly] = useState(false);
  const award = useCallback((roundId: string) => {
    const result = book.current!.award(roundId);
    if (result.newId) {
      setIds(result.ids);
      setRecent(result.newId);
      setSessionOnly(!result.saved);
    }
  }, []);
  useEffect(() => {
    if (!recent) return;
    const timer = setTimeout(() => setRecent(null), 5000);
    return () => clearTimeout(timer);
  }, [recent]);
  return { ids, recent, sessionOnly, award };
}
