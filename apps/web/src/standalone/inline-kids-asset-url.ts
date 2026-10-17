import inlined from 'virtual:kids-inline-assets';

/** Thay `asset-url.ts` trong bản HTML đơn lẻ; bỏ query cache vì data URI không cần làm mới. */
export const assetUrl = (path: string) => inlined[path.split('?')[0]] ?? path;
