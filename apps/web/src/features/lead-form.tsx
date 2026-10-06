import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError, type Car } from '../lib/api';
import { Button, Field, Modal } from '../components/ui';
/** Giữ key qua retry mạng; chỉ đổi khi người dùng chủ động mở một form/yêu cầu mới. */
export function LeadForm({
  car,
  type,
  onClose,
}: {
  car: Car;
  type: 'consultation' | 'test_drive';
  onClose: () => void;
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    preferredAt: '',
    message: '',
  });
  const request = useMutation({
    mutationFn: () =>
      api<{ data: { id: string } }>('/leads', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify({
          carId: car.id,
          type,
          name: form.name,
          phone: form.phone,
          ...(form.email ? { email: form.email } : {}),
          ...(type === 'test_drive' && form.preferredAt
            ? { preferredAt: new Date(`${form.preferredAt}+07:00`).toISOString() }
            : {}),
          ...(form.message ? { message: form.message } : {}),
        }),
      }),
  });
  const errors = request.error instanceof ApiError ? request.error.fields : undefined;
  return (
    <Modal title={type === 'test_drive' ? 'Đăng ký lái thử' : 'Nhận tư vấn'} onClose={onClose}>
      {request.isSuccess ? (
        <div className="success-message">
          <CheckCircle2 size={42} />
          <h3>Đã nhận yêu cầu của bạn.</h3>
          <p>
            Yêu cầu cho {car.brand} {car.model} đã được lưu vào hệ thống demo.
          </p>
          <p className="small muted">Mã yêu cầu: {request.data.data.id.slice(0, 8)}</p>
          <Button onClick={onClose}>Hoàn tất</Button>
        </div>
      ) : (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            request.mutate();
          }}
        >
          <p className="muted small">
            {car.brand} {car.model} · {car.year}
          </p>
          <div className="form-grid">
            <Field label="Họ và tên" error={errors?.name}>
              <input
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Số điện thoại" error={errors?.phone}>
              <input
                required
                autoComplete="tel"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Email (không bắt buộc)" error={errors?.email}>
            <input
              autoComplete="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          {type === 'test_drive' && (
            <Field label="Lịch lái thử · giờ Việt Nam (UTC+7)" error={errors?.preferredAt}>
              <input
                type="datetime-local"
                required
                value={form.preferredAt}
                onChange={(e) => setForm({ ...form, preferredAt: e.target.value })}
              />
            </Field>
          )}
          <Field label="Lời nhắn (không bắt buộc)" error={errors?.message}>
            <textarea
              maxLength={1000}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
          {request.error && (
            <p className="error-notice notice" role="alert">
              {request.error.message}
            </p>
          )}
          <Button type="submit" disabled={request.isPending}>
            {request.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
          <p className="small muted">
            Đây là demo. Yêu cầu được lưu trong database, không gửi email hoặc thực hiện giao dịch.
          </p>
        </form>
      )}
    </Modal>
  );
}
