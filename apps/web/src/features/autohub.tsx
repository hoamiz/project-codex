import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Heart,
  GitCompareArrows,
  Search,
  ArrowLeft,
  Check,
  ChevronRight,
} from 'lucide-react';
import { api, type Car, type Page } from '../lib/api';
import { LeadForm } from './lead-form';
import { Button, Badge, Pagination, State, statuses, money } from '../components/ui';
/** localStorage có thể bị chặn hoặc chứa dữ liệu cũ; luôn trả danh sách ID hợp lệ. */
function readStored(key: string): string[] {
  try {
    const x: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
export function useStoredIds(key: string) {
  const [ids, setIds] = useState(() => readStored(key));
  return [
    ids,
    (next: string[]) => {
      setIds(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Trình duyệt chặn lưu trữ: tính năng vẫn hoạt động trong phiên. */
      }
    },
  ] as const;
}
const fuel: Record<string, string> = {
  petrol: 'Xăng',
  diesel: 'Dầu',
  electric: 'Điện',
  hybrid: 'Hybrid',
};
function CarCard({
  car,
  favorite,
  onFavorite,
  selected,
  onCompare,
}: {
  car: Car;
  favorite: boolean;
  onFavorite: () => void;
  selected: boolean;
  onCompare: () => void;
}) {
  return (
    <article className="car-card">
      <Link to={`/projects/autohub/cars/${car.slug}`} className="car-image">
        <img src={car.imagePaths[0]} alt={`${car.brand} ${car.model} — hình minh họa`} />
        <Badge>{statuses[car.status]}</Badge>
      </Link>
      <Button
        variant="ghost"
        className="favorite-btn"
        aria-label={`Yêu thích ${car.model}`}
        aria-pressed={favorite}
        onClick={onFavorite}
      >
        <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
      </Button>
      <div className="car-copy">
        <div className="muted small">
          {car.brand.toUpperCase()} · {car.year}
        </div>
        <Link to={`/projects/autohub/cars/${car.slug}`}>
          <h3>
            {car.model}
            <ArrowUpRight size={18} />
          </h3>
        </Link>
        <p className="car-spec">
          {car.mileageKm.toLocaleString('vi-VN')} km <span>·</span> {fuel[car.fuelType]}{' '}
          <span>·</span> {car.transmission === 'automatic' ? 'Tự động' : 'Số sàn'}
        </p>
        <div className="car-bottom">
          <strong>{money(car.priceVnd)}</strong>
          <Button
            variant="ghost"
            aria-label={`So sánh ${car.model}`}
            aria-pressed={selected}
            onClick={onCompare}
          >
            {selected ? <Check size={18} /> : <GitCompareArrows size={18} />}
          </Button>
        </div>
      </div>
    </article>
  );
}
export function AutoHub() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [favorites, setFavorites] = useStoredIds('autohub-favorites');
  const [compare, setCompare] = useStoredIds('autohub-compare');
  const [notice, setNotice] = useState('');
  const searchInUrl = params.get('search') || '';
  useEffect(() => setSearch(searchInUrl), [searchInUrl]);
  const query = params.toString();
  const cars = useQuery({
    queryKey: ['cars', query],
    queryFn: ({ signal }) => api<Page<Car>>(`/cars?${query}`, { signal }),
  });
  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => api<{ data: string[] }>('/cars/brands'),
  });
  /** Đưa filter vào URL để chia sẻ/reload được; thay filter luôn về trang đầu. */
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next, { replace: name === 'search' });
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get('search') || '')) {
        const next = new URLSearchParams(params);
        if (search) next.set('search', search);
        else next.delete('search');
        next.delete('page');
        setParams(next, { replace: true });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, params, setParams]);
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) setCompare(compare.filter((v) => v !== id));
    else if (compare.length < 3) setCompare([...compare, id]);
    else setNotice('Bạn có thể so sánh tối đa 3 xe.');
  };
  return (
    <div className="autohub">
      <section className="auto-hero">
        <div>
          <div className="eyebrow">AUTOHUB / TUYỂN CHỌN CHO BẠN</div>
          <h1>
            Chặng đường mới.
            <br />
            Chiếc xe <em>của bạn.</em>
          </h1>
          <p>
            Tìm, khám phá và so sánh những chiếc xe phù hợp.
            <br />
            Một trải nghiệm mua xe bắt đầu từ sự an tâm.
          </p>
          <a className="btn btn-primary" href="#cars">
            Khám phá bộ sưu tập <ChevronRight size={17} />
          </a>
        </div>
        <img src="/images/car-1.svg" alt="Xe minh họa của AutoHub" />
      </section>
      <div className="auto-benefits">
        <span>
          <Check size={16} />
          Thông số rõ ràng
        </span>
        <span>
          <Check size={16} />
          So sánh dễ dàng
        </span>
        <span>
          <Check size={16} />
          Đặt lịch lái thử
        </span>
      </div>
      <section id="cars" className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">BỘ SƯU TẬP</div>
            <h2>Tìm xe phù hợp.</h2>
          </div>
          <span className="muted">{cars.data?.pagination.total ?? '—'} lựa chọn dành cho bạn</span>
        </div>
        <div className="filters">
          <label className="search-box">
            <Search size={18} />
            <input
              aria-label="Tìm kiếm xe"
              placeholder="Tìm hãng, dòng xe…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Hãng xe"
            value={params.get('brand') || ''}
            onChange={(e) => change('brand', e.target.value)}
          >
            <option value="">Tất cả hãng xe</option>
            {brands.data?.data.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select
            aria-label="Giá tối đa"
            value={params.get('maxPrice') || ''}
            onChange={(e) => change('maxPrice', e.target.value)}
          >
            <option value="">Mọi khoảng giá</option>
            <option value="700000000">Dưới 700 triệu</option>
            <option value="1000000000">Dưới 1 tỷ</option>
            <option value="1500000000">Dưới 1.5 tỷ</option>
          </select>
          <input
            className="year-filter"
            aria-label="Năm sản xuất"
            placeholder="Năm"
            type="number"
            min="1900"
            max="2100"
            value={params.get('year') || ''}
            onChange={(e) => change('year', e.target.value)}
          />
          <select
            aria-label="Sắp xếp"
            value={params.get('sort') || 'newest'}
            onChange={(e) => change('sort', e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="year_desc">Năm mới nhất</option>
          </select>
        </div>
        {notice && (
          <div role="status" className="notice">
            {notice}
            <Button variant="ghost" onClick={() => setNotice('')}>
              Đóng
            </Button>
          </div>
        )}
        {cars.isPending || cars.isError ? (
          <State loading={cars.isPending} error={cars.error} onRetry={() => void cars.refetch()} />
        ) : cars.data?.data.length ? (
          <>
            <div className="car-grid">
              {cars.data.data.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  favorite={favorites.includes(car.id)}
                  onFavorite={() =>
                    setFavorites(
                      favorites.includes(car.id)
                        ? favorites.filter((v) => v !== car.id)
                        : [...favorites, car.id],
                    )
                  }
                  selected={compare.includes(car.id)}
                  onCompare={() => toggleCompare(car.id)}
                />
              ))}
            </div>
            <Pagination {...cars.data.pagination} onChange={(p) => change('page', String(p))} />
          </>
        ) : (
          <State empty />
        )}
      </section>
      {compare.length > 0 && (
        <div className="compare-dock">
          <span>
            <GitCompareArrows size={20} />
            {compare.length}/3 xe đã chọn
          </span>
          <Button variant="ghost" onClick={() => setCompare([])}>
            Bỏ chọn
          </Button>
          <Link
            className="btn btn-primary"
            to={`/projects/autohub/compare?ids=${compare.join(',')}`}
          >
            So sánh ngay <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
export function CarDetail() {
  const { slug } = useParams();
  const [selected, setSelected] = useState(0);
  const car = useQuery({
    queryKey: ['car', slug],
    queryFn: () => api<{ data: Car }>(`/cars/${slug}`),
  });
  return (
    <section className="section">
      <Link className="back-link" to="/projects/autohub">
        <ArrowLeft size={16} /> Bộ sưu tập xe
      </Link>
      {car.isPending || car.isError ? (
        <State loading={car.isPending} error={car.error} onRetry={() => void car.refetch()} />
      ) : (
        car.data && (
          <CarDetailContent car={car.data.data} selected={selected} setSelected={setSelected} />
        )
      )}
    </section>
  );
}
export function CarDetailContent({
  car,
  selected,
  setSelected,
}: {
  car: Car;
  selected: number;
  setSelected: (n: number) => void;
}) {
  const [leadType, setLeadType] = useState<'consultation' | 'test_drive' | null>(null);
  return (
    <div className="detail-grid">
      <div>
        <div className="gallery-main">
          <img
            src={car.imagePaths[selected]}
            alt={`${car.brand} ${car.model} — hình minh họa ${selected + 1}`}
          />
        </div>
        <div className="gallery-thumbs">
          {car.imagePaths.map((src, i) => (
            <button
              key={src}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
        <p className="small muted">Hình ảnh vector mang tính minh họa.</p>
        <h2>Mỗi hành trình, một lựa chọn.</h2>
        <p>{car.description}</p>
      </div>
      <div className="detail-info">
        <Badge>{statuses[car.status]}</Badge>
        <p className="eyebrow">
          {car.brand} / {car.year}
        </p>
        <h1>{car.model}</h1>
        <div className="detail-price">{money(car.priceVnd)}</div>
        <dl>
          {[
            ['Năm sản xuất', car.year],
            ['Số km', `${car.mileageKm.toLocaleString('vi-VN')} km`],
            ['Nhiên liệu', fuel[car.fuelType]],
            ['Hộp số', car.transmission === 'automatic' ? 'Tự động' : 'Số sàn'],
            ['Số chỗ', car.seats],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="form-stack">
          <Button disabled={car.status !== 'available'} onClick={() => setLeadType('test_drive')}>
            Đăng ký lái thử <ChevronRight size={16} />
          </Button>
          <Button
            variant="outline"
            disabled={car.status !== 'available'}
            onClick={() => setLeadType('consultation')}
          >
            Nhận tư vấn
          </Button>
        </div>
        <p className="muted small" style={{ marginTop: 18 }}>
          {car.status === 'available'
            ? 'Thông tin và giá là dữ liệu minh họa cho project.'
            : 'Xe này hiện không nhận yêu cầu mới.'}
        </p>
        {leadType && <LeadForm car={car} type={leadType} onClose={() => setLeadType(null)} />}
      </div>
    </div>
  );
}
export function Compare() {
  const [params] = useSearchParams();
  const ids = params.get('ids') || '';
  const cars = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => api<{ data: Car[] }>(`/cars/by-ids?ids=${encodeURIComponent(ids)}`),
    enabled: !!ids,
  });
  return (
    <section className="section">
      <Link className="back-link" to="/projects/autohub">
        <ArrowLeft size={16} />
        Quay lại bộ sưu tập
      </Link>
      <h1>Đặt cạnh nhau. Chọn dễ hơn.</h1>
      {!ids ? (
        <State empty />
      ) : cars.isPending || cars.isError ? (
        <State loading={cars.isPending} error={cars.error} onRetry={() => void cars.refetch()} />
      ) : (
        <>
          <p className="muted">
            {cars.data?.data.length} xe còn được công khai. Xe đã lưu trữ được bỏ khỏi kết quả.
          </p>
          <div className="compare-grid">
            {cars.data?.data.map((c) => (
              <div className="compare-card" key={c.id}>
                <img src={c.imagePaths[0]} alt={`${c.brand} ${c.model}`} />
                <h2>
                  {c.brand} {c.model}
                </h2>
                <strong>{money(c.priceVnd)}</strong>
                <dl>
                  {[
                    ['Năm', c.year],
                    ['Số km', c.mileageKm],
                    ['Nhiên liệu', fuel[c.fuelType]],
                    ['Số chỗ', c.seats],
                    ['Trạng thái', statuses[c.status]],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link className="btn btn-outline" to={`/projects/autohub/cars/${c.slug}`}>
                  Xem chi tiết
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
