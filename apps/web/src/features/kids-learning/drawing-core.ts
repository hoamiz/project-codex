import type { Point } from './lessons';
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** Đổi client sang viewBox, giữ tọa độ ngoài bảng để caller hủy nét thay vì snap nhầm đích. */
export function clientPoint(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): Point {
  if (
    ![x, y, rect.left, rect.top, rect.width, rect.height, width, height].every(Number.isFinite) ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    throw new Error('Vùng vẽ chưa sẵn sàng');
  return { x: ((x - rect.left) * width) / rect.width, y: ((y - rect.top) * height) / rect.height };
}
export function pathLength(points: Point[]) {
  return points.slice(1).reduce((length, p, i) => length + distance(points[i], p), 0);
}
/** Lấy mẫu theo khoảng cách thật, nội suy cả sự kiện thưa; giới hạn điểm để không tăng bộ nhớ vô hạn. */
export function resample(points: Point[], step = 4): Point[] {
  if (step <= 0 || !Number.isFinite(step)) return [];
  const clean = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).slice(0, 4096);
  if (!clean.length) return [];
  const result = [clean[0]];
  let carry = 0;
  for (let i = 1; i < clean.length && result.length < 8192; i++) {
    let from = clean[i - 1];
    const to = clean[i];
    let span = distance(from, to);
    while (span + carry >= step && result.length < 8192) {
      const t = (step - carry) / span;
      from = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      result.push(from);
      span = distance(from, to);
      carry = 0;
    }
    carry += span;
  }
  const last = clean.at(-1)!;
  if (distance(result.at(-1)!, last) > 0.01) result.push(last);
  return result;
}
export function polyline(points: Point[]) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
/** Chỉ hai anchor quyết định nét cuối; raw pointer/vòng thừa không được giữ trong model. */
export function connectionPath(a: Point, b: Point) {
  const bend = (b.x - a.x) * 0.42;
  return `M${a.x},${a.y} C${a.x + bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`;
}
