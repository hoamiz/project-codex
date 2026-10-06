import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Archive, RefreshCw } from 'lucide-react';
import { api, ApiError, type Car, type Page } from '../lib/api';
import { Badge, Button, Field, Modal, Pagination, State, money, statuses } from '../components/ui';
type CarInput = Pick<
  Car,
  | 'slug'
  | 'brand'
  | 'model'
  | 'year'
  | 'priceVnd'
  | 'mileageKm'
  | 'fuelType'
  | 'transmission'
  | 'seats'
  | 'description'
  | 'status'
  | 'imagePaths'
>;
const blank: CarInput = {
  slug: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  priceVnd: 0,
  mileageKm: 0,
  fuelType: 'petrol',
  transmission: 'automatic',
  seats: 5,
  description: '',
  status: 'available',
  imagePaths: ['/images/car-1.svg'],
};
function values(car: Car): CarInput {
  return {
    slug: car.slug,
    brand: car.brand,
    model: car.model,
    year: car.year,
    priceVnd: car.priceVnd,
    mileageKm: car.mileageKm,
    fuelType: car.fuelType,
    transmission: car.transmission,
    seats: car.seats,
    description: car.description,
    status: car.status,
    imagePaths: car.imagePaths,
  };
}
/** Giữ bản nhập khi gặp conflict; người dùng xem bản server rồi quyết định lưu với version mới. */
function CarForm({ car, onClose }: { car: Car | null; onClose: () => void }) {
  const initial = car ? values(car) : blank;
  const [form, setForm] = useState<CarInput>(initial);
  const [version, setVersion] = useState(car?.version);
  const [latest, setLatest] = useState<Car | null>(null);
  const client = useQueryClient();
  const dirty = JSON.stringify(initial) !== JSON.stringify(form);
  const close = () => {
    if (!dirty || window.confirm('Bạn có thay đổi chưa lưu. Đóng form?')) onClose();
  };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = useMutation({
    mutationFn: () =>
      api(`/admin/cars${car ? `/${car.id}` : ''}`, {
        method: car ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, ...(car ? { version } : {}) }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-cars'] });
      void client.invalidateQueries({ queryKey: ['cars'] });
      void client.invalidateQueries({ queryKey: ['car'] });
      void client.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
  });
  const errors = save.error instanceof ApiError ? save.error.fields : undefined;
  const update = (key: keyof CarInput, value: string | number | string[]) =>
    setForm({ ...form, [key]: value });
  const refresh = async () => {
    if (!car) return;
    try {
      const r = await api<{ data: Car }>(`/admin/cars/${car.id}`);
      setLatest(r.data);
      setVersion(r.data.version);
    } catch {
      /* Mutation error vẫn được giữ để người dùng có thể thử tải lại. */
    }
  };
  return (
    <Modal title={car ? 'Chỉnh sửa xe' : 'Thêm xe mới'} onClose={close}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {[
          ['brand', 'Hãng xe'],
          ['model', 'Dòng xe'],
          ['slug', 'Slug URL'],
        ].map(([key, label]) => (
          <Field key={key} label={label} error={errors?.[key]}>
            <input
              required
              value={String(form[key as keyof CarInput])}
              onChange={(e) => update(key as keyof CarInput, e.target.value)}
            />
          </Field>
        ))}
        {[
          ['year', 'Năm sản xuất'],
          ['priceVnd', 'Giá (VND)'],
          ['mileageKm', 'Số km'],
          ['seats', 'Số chỗ'],
        ].map(([key, label]) => (
          <Field key={key} label={label} error={errors?.[key]}>
            <input
              required
              type="number"
              min="0"
              value={Number(form[key as keyof CarInput])}
              onChange={(e) => update(key as keyof CarInput, Number(e.target.value))}
            />
          </Field>
        ))}
        <Field label="Nhiên liệu" error={errors?.fuelType}>
          <select value={form.fuelType} onChange={(e) => update('fuelType', e.target.value)}>
            {[
              ['petrol', 'Xăng'],
              ['diesel', 'Dầu'],
              ['electric', 'Điện'],
              ['hybrid', 'Hybrid'],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hộp số">
          <select
            value={form.transmission}
            onChange={(e) => update('transmission', e.target.value)}
          >
            <option value="automatic">Tự động</option>
            <option value="manual">Số sàn</option>
          </select>
        </Field>
        <Field label="Trạng thái">
          <select value={form.status} onChange={(e) => update('status', e.target.value)}>
            {['available', 'reserved', 'sold', 'archived'].map((s) => (
              <option value={s} key={s}>
                {statuses[s]}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-full">
          <Field label="Mô tả" error={errors?.description}>
            <textarea
              required
              minLength={10}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </Field>
        </div>
        <div className="form-full">
          <Field label="Ảnh minh họa" error={errors?.imagePaths}>
            <select
              value={form.imagePaths[0]}
              onChange={(e) => update('imagePaths', [e.target.value])}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={`/images/car-${i + 1}.svg`}>
                  Ảnh {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <img className="image-preview" src={form.imagePaths[0]} alt="Ảnh xem trước" />
        </div>
        {save.error && (
          <div className="form-full notice error-notice" role="alert">
            {save.error.message}
            {save.error instanceof ApiError && save.error.status === 409 && car && (
              <Button variant="outline" onClick={() => void refresh()} type="button">
                <RefreshCw size={15} />
                Tải bản mới
              </Button>
            )}
          </div>
        )}
        {latest && (
          <div className="form-full notice">
            Bản server v{latest.version}: {latest.brand} {latest.model}, {money(latest.priceVnd)}.
            Dữ liệu đang nhập được giữ; kiểm tra trước khi lưu.
          </div>
        )}
        <div className="form-full form-actions">
          <Button variant="outline" type="button" onClick={close}>
            Hủy
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Đang lưu…' : 'Lưu xe'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function AdminCars() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Car | null | undefined>(undefined);
  const client = useQueryClient();
  const cars = useQuery({
    queryKey: ['admin-cars', params.toString()],
    queryFn: () => api<Page<Car>>(`/admin/cars?${params}`),
  });
  const archive = useMutation({
    mutationFn: (car: Car) =>
      api(`/admin/cars/${car.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ version: car.version }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-cars'] });
      void client.invalidateQueries({ queryKey: ['cars'] });
      void client.invalidateQueries({ queryKey: ['stats'] });
    },
  });
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <>
      <div className="admin-heading">
        <div>
          <div className="eyebrow">AUTOHUB / INVENTORY</div>
          <h1>Quản lý xe.</h1>
          <p className="muted small">{cars.data?.pagination.total ?? '—'} xe trong hệ thống</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} />
          Thêm xe
        </Button>
      </div>
      <div className="filters">
        <input
          aria-label="Tìm kiếm xe quản trị"
          placeholder="Tìm hãng hoặc dòng xe…"
          value={params.get('search') || ''}
          onChange={(e) => change('search', e.target.value)}
        />
        <select
          aria-label="Trạng thái xe"
          value={params.get('status') || 'all'}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          {['available', 'reserved', 'sold', 'archived'].map((s) => (
            <option key={s} value={s}>
              {statuses[s]}
            </option>
          ))}
        </select>
      </div>
      {archive.error && (
        <div className="notice error-notice" role="alert">
          {archive.error.message}
          <Button variant="outline" onClick={() => void cars.refetch()}>
            Tải lại
          </Button>
        </div>
      )}
      {cars.isPending || cars.isError ? (
        <State loading={cars.isPending} error={cars.error} onRetry={() => void cars.refetch()} />
      ) : cars.data?.data.length ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Xe</th>
                  <th>Giá</th>
                  <th>Năm</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {cars.data.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="table-car">
                        <img src={c.imagePaths[0]} alt="" />
                        <div>
                          <strong>
                            {c.brand} {c.model}
                          </strong>
                          <small>{c.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td>{money(c.priceVnd)}</td>
                    <td>{c.year}</td>
                    <td>
                      <Badge>{statuses[c.status]}</Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          aria-label={`Sửa ${c.model}`}
                          onClick={() => setEditing(c)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`Lưu trữ ${c.model}`}
                          disabled={archive.isPending || c.status === 'archived'}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Lưu trữ ${c.brand} ${c.model}? Yêu cầu khách hàng vẫn được giữ.`,
                              )
                            )
                              archive.mutate(c);
                          }}
                        >
                          <Archive size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...cars.data.pagination} onChange={(p) => change('page', String(p))} />
        </>
      ) : (
        <State empty />
      )}
      {editing !== undefined && <CarForm car={editing} onClose={() => setEditing(undefined)} />}
    </>
  );
}
