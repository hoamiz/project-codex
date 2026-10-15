import { resample } from './drawing-core';
import type { Point } from './lessons';

/** Đổi hệ tọa độ khi resize, giữ lề neo 32 px và nét gốc để animation/ô trả về cùng khớp mẫu. */
export function scaleStroke(points: Point[], drawnWidth: number, width: number): Point[] {
  return points.map((p) => ({
    x: 32 + ((p.x - 32) * (width - 64)) / Math.max(1, drawnWidth - 64),
    y: p.y,
  }));
}

/** Chỉ làm mượt nét đã chấm đúng để diễn hoạt; giữ hai đầu và không thay đầu vào bộ chấm. */
export function journeyPath(points: Point[]) {
  const samples = resample(points, 6);
  const pair = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  if (!samples.length) return '';
  let path = `M${pair(samples[0])}`;
  for (let i = 1; i < samples.length - 1; i++) {
    const here = samples[i],
      next = samples[i + 1];
    path += ` Q${pair(here)} ${pair({ x: (here.x + next.x) / 2, y: (here.y + next.y) / 2 })}`;
  }
  if (samples.length > 1) path += ` L${pair(samples.at(-1)!)}`;
  return path;
}
