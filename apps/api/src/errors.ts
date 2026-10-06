import { z } from 'zod';
import type { ErrorRequestHandler } from 'express';
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
/** Chỉ trả lỗi an toàn cho client; chi tiết query/credential không ra response hoặc log. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: 'Vui lòng kiểm tra dữ liệu nhập.',
        fields: z.flattenError(err).fieldErrors,
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }
  const code = (err as { code?: string }).code;
  if (code === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại.' } });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'JSON không hợp lệ.' } });
    return;
  }
  console.error('Request failed:', code || 'internal');
  res
    .status(503)
    .json({ error: { code: 'UNAVAILABLE', message: 'Dịch vụ chưa sẵn sàng. Vui lòng thử lại.' } });
};
export const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
};
export function pagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
