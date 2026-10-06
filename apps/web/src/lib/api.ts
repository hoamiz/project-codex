export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
let csrfToken = '';
export function setCsrf(value: string) {
  csrfToken = value;
}
/** Giữ cookie cùng origin; truyền CSRF cho request ghi và giữ lỗi theo field để form hiển thị chính xác. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...options.headers,
    },
  });
  const body = await response.json();
  if (response.status === 401 && path !== '/auth/login')
    window.dispatchEvent(new Event('codex:unauthorized'));
  if (!response.ok)
    throw new ApiError(
      body.error?.message || 'Không tải được dữ liệu',
      response.status,
      body.error?.fields,
    );
  return body as T;
}
export interface Page<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface Car {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  priceVnd: number;
  mileageKm: number;
  fuelType: string;
  transmission: string;
  seats: number;
  description: string;
  status: string;
  imagePaths: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Lead {
  id: string;
  carId: string;
  type: string;
  name: string;
  phone: string;
  email?: string;
  preferredAt?: string;
  message?: string;
  status: string;
  version: number;
  createdAt: string;
  carTitle: string;
}
