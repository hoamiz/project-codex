import type { NumberRange } from './lessons';
/** Chỉ sửa ô vừa commit; fallback dựa vào ô đối diện đã hợp lệ, không clamp rồi thay đổi ý nghĩa quy tắc. */
export function commitRange(
  range: NumberRange,
  field: keyof NumberRange,
  raw: string,
): NumberRange {
  const n = raw.trim() === '' ? NaN : Number(raw);
  const valid = Number.isInteger(n) && n >= 1 && n <= 10;
  if (field === 'start') return { ...range, start: valid && n < range.end ? n : range.end - 1 };
  return { ...range, end: valid && n > range.start ? n : range.start + 1 };
}
export function validRange(range: NumberRange) {
  return (
    Number.isInteger(range.start) &&
    Number.isInteger(range.end) &&
    range.start >= 1 &&
    range.start < range.end &&
    range.end <= 10
  );
}
