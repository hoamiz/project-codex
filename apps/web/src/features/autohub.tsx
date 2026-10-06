import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Heart,
  GitCompareArrows,
  Search,
  ArrowLeft,
  Check,
  ChevronRight,
  CarFront,
  SlidersHorizontal,
  X,
  Gauge,
  Fuel,
  Settings2,
  ShieldCheck,
  CalendarDays,
  MessageCircle,
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
/** Lưu yêu thích/so sánh qua lần tải lại; nếu storage bị chặn vẫn giữ trạng thái trong phiên. */
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
          <span>{car.brand}</span>
          <span>{car.year}</span>
        </div>
        <Link to={`/projects/autohub/cars/${car.slug}`}>
          <h3>
            {car.model}
            <ArrowUpRight size={18} />
          </h3>
        </Link>
        <p className="car-spec">
          <span>
            <Gauge size={14} />
            {car.mileageKm.toLocaleString('vi-VN')} km
          </span>
          <span>
            <Fuel size={14} />
            {fuel[car.fuelType]}
          </span>
          <span>
            <Settings2 size={14} />
            {car.transmission === 'automatic' ? 'Tự động' : 'Số sàn'}
          </span>
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
            <span>{selected ? 'Đã chọn' : 'So sánh'}</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
export function AutoHub() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [favorites, setFavorites] = useStoredIds('autohub-favorites');
  const [compare, setCompare] = useStoredIds('autohub-compare');
  const [notice, setNotice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  // Chờ dữ liệu để bố cục ổn định trước khi cuộn; React Router đổi hash mà không tự cuộn tới mục.
  useEffect(() => {
    if (!location.hash || cars.isPending || brands.isPending) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView(),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.key, cars.isPending, brands.isPending]);
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
  /** Giới hạn ba xe theo hợp đồng API so sánh; bỏ chọn luôn được phép khi đã đủ chỗ. */
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) setCompare(compare.filter((v) => v !== id));
    else if (compare.length < 3) setCompare([...compare, id]);
    else setNotice('Bạn có thể so sánh tối đa 3 xe.');
  };
  const activeFilters = (
    [
      ['search', 'Từ khóa', params.get('search')],
      ['brand', 'Hãng xe', params.get('brand')],
      ['minPrice', 'Giá từ', params.has('minPrice') ? money(Number(params.get('minPrice'))) : null],
      [
        'maxPrice',
        'Giá đến',
        params.has('maxPrice') ? money(Number(params.get('maxPrice'))) : null,
      ],
      ['year', 'Năm', params.get('year')],
      [
        'status',
        'Trạng thái',
        params.has('status')
          ? params.get('status') === 'all'
            ? 'Tất cả'
            : statuses[params.get('status') || '']
          : null,
      ],
    ] as const
  ).filter((filter) => filter[2]);
  /** Chỉ bỏ điều kiện tìm xe; giữ thứ tự sắp xếp và kích thước trang của URL được chia sẻ. */
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    for (const key of ['search', 'brand', 'minPrice', 'maxPrice', 'year', 'status'])
      next.delete(key);
    next.delete('page');
    setSearch('');
    setParams(next);
  };
  return (
    <div className="autohub">
      <section className="auto-hero">
        <div className="auto-hero-copy">
          <div className="eyebrow">
            <span /> HÀNH TRÌNH CỦA BẠN BẮT ĐẦU TỪ ĐÂY
          </div>
          <h1>
            Chặng đường mới.
            <br />
            <span>Chiếc xe của bạn.</span>
          </h1>
          <p>
            Khám phá những lựa chọn phù hợp với ngân sách.
            <br /> So sánh rõ ràng, tự tin chọn chiếc xe tiếp theo.
          </p>
          <a className="btn btn-primary" href="#cars">
            Tìm xe ngay <ArrowUpRight size={18} />
          </a>
          <a className="auto-hero-guide" href="#buy-guide">
            Mua xe bắt đầu từ đâu? <ChevronRight size={15} />
          </a>
        </div>
        <div className="auto-hero-visual" aria-hidden="true">
          <div className="auto-hero-orbit" />
          <span className="auto-hero-wordmark">AUTOHUB</span>
          <img src="/images/car-1.svg" alt="" />
          <span className="auto-hero-tag">
            <CarFront size={18} /> MỘT CHIẾC XE. NHIỀU KHẢ NĂNG.
          </span>
        </div>
      </section>
      <div className="auto-benefits">
        <span>
          <ShieldCheck size={18} /> Thông số & giá rõ ràng
        </span>
        <span>
          <GitCompareArrows size={18} /> So sánh tối đa 3 xe
        </span>
        <span>
          <CalendarDays size={18} /> Gửi lịch hẹn lái thử
        </span>
      </div>
      <section className="auto-brands" aria-labelledby="auto-brands-heading">
        <div className="auto-section-heading">
          <h2 id="auto-brands-heading">Bạn thích hãng xe nào?</h2>
          <a href="#cars">
            Xem tất cả xe <ArrowUpRight size={15} />
          </a>
        </div>
        {brands.isPending ? (
          <p className="muted small" role="status">
            Đang tải hãng xe…
          </p>
        ) : brands.isError ? (
          <State error={brands.error} onRetry={() => void brands.refetch()} />
        ) : (
          <div className="auto-brand-list">
            <button
              className="auto-brand-button"
              aria-pressed={!params.has('brand')}
              onClick={() => change('brand', '')}
            >
              <span>
                <CarFront size={23} />
              </span>
              Tất cả hãng
            </button>
            {brands.data?.data.map((brand) => (
              <button
                key={brand}
                className="auto-brand-button"
                aria-pressed={params.get('brand') === brand}
                onClick={() => change('brand', brand)}
              >
                <span aria-hidden="true">{brand.slice(0, 2).toUpperCase()}</span>
                {brand}
              </button>
            ))}
          </div>
        )}
      </section>
      <section id="cars" className="section auto-catalog" aria-labelledby="auto-catalog-heading">
        <div className="auto-catalog-heading">
          <div>
            <div className="eyebrow">KHÁM PHÁ · SO SÁNH · LỰA CHỌN</div>
            <h2 id="auto-catalog-heading">Tìm chiếc xe phù hợp</h2>
          </div>
          <span className="auto-catalog-note">
            <CarFront size={17} /> Một lựa chọn cho mỗi hành trình
          </span>
        </div>
        <Button
          variant="outline"
          className="auto-filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="auto-filter-panel"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal size={17} /> Bộ lọc{' '}
          {activeFilters.length > 0 && <span>{activeFilters.length}</span>}
          <ChevronRight size={16} />
        </Button>
        <div className="auto-catalog-layout">
          <aside
            id="auto-filter-panel"
            className={`auto-filter-panel ${filtersOpen ? 'is-open' : ''}`}
            aria-label="Lọc danh sách xe"
          >
            <div className="auto-filter-title">
              <h3>
                <SlidersHorizontal size={18} /> Bộ lọc tìm xe
              </h3>
              <Button variant="ghost" onClick={clearFilters} disabled={!activeFilters.length}>
                Xóa lọc
              </Button>
            </div>
            <label className="auto-filter-field">
              <span>Hãng xe</span>
              <select
                aria-label="Hãng xe"
                value={params.get('brand') || ''}
                onChange={(e) => change('brand', e.target.value)}
              >
                <option value="">Tất cả hãng xe</option>
                {brands.data?.data.map((brand) => (
                  <option key={brand}>{brand}</option>
                ))}
              </select>
            </label>
            <label className="auto-filter-field">
              <span>Ngân sách tối đa</span>
              <select
                aria-label="Giá tối đa"
                value={params.get('maxPrice') || ''}
                onChange={(e) => change('maxPrice', e.target.value)}
              >
                <option value="">Mọi khoảng giá</option>
                <option value="700000000">Đến 700 triệu</option>
                <option value="1000000000">Đến 1 tỷ</option>
                <option value="1500000000">Đến 1,5 tỷ</option>
              </select>
            </label>
            <label className="auto-filter-field">
              <span>Năm sản xuất</span>
              <input
                aria-label="Năm sản xuất"
                placeholder="Ví dụ: 2023"
                type="number"
                min="1900"
                max="2100"
                value={params.get('year') || ''}
                onChange={(e) => change('year', e.target.value)}
              />
            </label>
            <label className="auto-filter-field">
              <span>Trạng thái xe</span>
              <select
                aria-label="Trạng thái xe"
                value={params.get('status') || 'available'}
                onChange={(e) =>
                  change('status', e.target.value === 'available' ? '' : e.target.value)
                }
              >
                <option value="available">Đang bán</option>
                <option value="reserved">Đã giữ chỗ</option>
                <option value="sold">Đã bán</option>
                <option value="all">Tất cả trạng thái</option>
              </select>
            </label>
            <div className="auto-filter-tip">
              <GitCompareArrows size={23} />
              <strong>Phân vân giữa vài chiếc xe?</strong>
              <p>Chọn “So sánh” trên thẻ xe để xem tối đa 3 lựa chọn cạnh nhau.</p>
            </div>
          </aside>
          <div className="auto-results">
            <form
              className="auto-search"
              role="search"
              aria-label="Tìm xe trong AutoHub"
              onSubmit={(e) => {
                e.preventDefault();
                change('search', search);
              }}
            >
              <label className="search-box">
                <Search size={20} />
                <input
                  aria-label="Tìm kiếm xe"
                  placeholder="Tìm theo hãng, dòng xe hoặc từ khóa…"
                  maxLength={100}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Button type="submit">
                Tìm xe <Search size={16} />
              </Button>
            </form>
            <div className="auto-results-toolbar">
              <p aria-live="polite">
                Tìm thấy <strong>{cars.data?.pagination.total ?? '—'}</strong> xe phù hợp
              </p>
              <label className="auto-sort">
                <span>Sắp xếp:</span>
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
              </label>
            </div>
            {activeFilters.length > 0 && (
              <div className="auto-active-filters" aria-label="Bộ lọc đang dùng">
                {activeFilters.map(([key, label, value]) => (
                  <button
                    key={key}
                    aria-label={`Bỏ lọc ${label}: ${value}`}
                    onClick={() => change(key, '')}
                  >
                    {value}
                    <X size={13} />
                  </button>
                ))}
                <Button variant="ghost" onClick={clearFilters}>
                  Xóa tất cả bộ lọc
                </Button>
              </div>
            )}
            {notice && (
              <div role="status" className="notice">
                {notice}
                <Button variant="ghost" onClick={() => setNotice('')}>
                  Đóng
                </Button>
              </div>
            )}
            {cars.isPending || cars.isError ? (
              <State
                loading={cars.isPending}
                error={cars.error}
                onRetry={() => void cars.refetch()}
              />
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
          </div>
        </div>
      </section>
      <section id="buy-guide" className="auto-buy-guide" aria-labelledby="auto-guide-heading">
        <div className="auto-section-heading">
          <div>
            <div className="eyebrow">ĐƠN GIẢN TỪ BƯỚC ĐẦU TIÊN</div>
            <h2 id="auto-guide-heading">Chiếc xe tiếp theo, chỉ vài bước.</h2>
          </div>
          <a href="#cars">
            Bắt đầu tìm xe <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="auto-guide-grid">
          <article>
            <span className="auto-guide-icon">
              <Search size={23} />
            </span>
            <span className="auto-guide-number">01</span>
            <h3>Tìm đúng lựa chọn</h3>
            <p>Lọc theo hãng, ngân sách và năm sản xuất. Lưu chiếc xe bạn thích để xem lại.</p>
          </article>
          <article>
            <span className="auto-guide-icon">
              <GitCompareArrows size={23} />
            </span>
            <span className="auto-guide-number">02</span>
            <h3>So sánh trước khi chọn</h3>
            <p>Đặt thông số và giá của tối đa 3 chiếc xe cạnh nhau để dễ quyết định.</p>
          </article>
          <article>
            <span className="auto-guide-icon">
              <CalendarDays size={23} />
            </span>
            <span className="auto-guide-number">03</span>
            <h3>Hẹn một buổi lái thử</h3>
            <p>Mở chi tiết xe đang bán, gửi yêu cầu tư vấn hoặc chọn lịch hẹn lái thử.</p>
          </article>
        </div>
      </section>
      {compare.length > 0 && (
        <div className="compare-dock">
          <span>
            <GitCompareArrows size={20} />
            <span>
              <strong>{compare.length}/3 xe đã chọn</strong>
              <small>Sẵn sàng đặt cạnh nhau</small>
            </span>
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
    <section className="section auto-detail">
      <Link className="back-link" to="/projects/autohub">
        <ArrowLeft size={16} /> Quay lại danh sách xe
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
        <div className="auto-detail-contact">
          <MessageCircle size={20} />
          <div>
            <strong>Muốn tìm hiểu thêm về chiếc xe này?</strong>
            <p>
              Gửi yêu cầu tư vấn hoặc lịch hẹn. Thông tin xe và thời gian bạn chọn sẽ đi cùng yêu
              cầu.
            </p>
          </div>
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
    <section className="section auto-compare">
      <Link className="back-link" to="/projects/autohub">
        <ArrowLeft size={16} />
        Quay lại bộ sưu tập
      </Link>
      <div className="eyebrow">AUTOHUB · SO SÁNH XE</div>
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
                <strong className="compare-price">{money(c.priceVnd)}</strong>
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
