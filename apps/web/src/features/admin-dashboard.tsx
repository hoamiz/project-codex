import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CarFront, Contact, CalendarCheck, ArrowUpRight, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { State } from '../components/ui';
interface Stats {
  cars: { status: string; count: number }[];
  leads: { status: string; count: number }[];
  testDrives: { day: string; count: number }[];
  timeZone: string;
}
export function Dashboard() {
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => api<{ data: Stats }>('/admin/stats'),
  });
  if (stats.isPending || stats.isError)
    return (
      <State loading={stats.isPending} error={stats.error} onRetry={() => void stats.refetch()} />
    );
  const s = stats.data!.data;
  const count = (rows: { status: string; count: number }[], status?: string) =>
    rows.filter((r) => !status || r.status === status).reduce((n, r) => n + r.count, 0);
  const cards = [
    {
      label: 'Xe đang bán',
      value: count(s.cars, 'available'),
      icon: CarFront,
      detail: 'Sẵn sàng cho hành trình mới',
    },
    {
      label: 'Yêu cầu mới',
      value: count(s.leads, 'new'),
      icon: Contact,
      detail: 'Khách hàng đang chờ phản hồi',
    },
    {
      label: 'Đăng ký lái thử',
      value: s.testDrives.reduce((n, d) => n + d.count, 0),
      icon: CalendarCheck,
      detail: 'Tổng số yêu cầu trong 7 ngày',
    },
  ];
  const max = Math.max(1, ...s.testDrives.map((d) => d.count));
  return (
    <>
      <div className="admin-heading">
        <div>
          <div className="eyebrow">CONTROL CENTER / OVERVIEW</div>
          <h1>Một góc nhìn rõ ràng.</h1>
          <p className="muted small">Dữ liệu hiện tại từ AutoHub, luôn trong tầm tay.</p>
        </div>
        <Link to="/projects/admin/cars" className="btn btn-primary">
          <Plus size={16} />
          Quản lý xe
        </Link>
      </div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div>
              <span>{c.label}</span>
              <c.icon size={20} />
            </div>
            <strong>{c.value}</strong>
            <p>{c.detail}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Đăng ký lái thử.</h2>
            <span className="badge">7 NGÀY GẦN NHẤT</span>
          </div>
          <p className="muted small">Đếm theo ngày gửi yêu cầu · giờ Việt Nam (UTC+7)</p>
          <div className="bar-chart" role="img" aria-label="Số đăng ký lái thử trong 7 ngày">
            {s.testDrives.map((d) => (
              <div key={d.day}>
                <strong>{d.count}</strong>
                <span style={{ height: `${Math.max(4, (d.count / max) * 140)}px` }} />
                <small>{d.day.slice(5).split('-').reverse().join('/')}</small>
              </div>
            ))}
          </div>
          <details className="small">
            <summary>Xem số liệu bằng văn bản</summary>
            <ul>
              {s.testDrives.map((d) => (
                <li key={d.day}>
                  {d.day}: {d.count} đăng ký
                </li>
              ))}
            </ul>
          </details>
        </section>
        <section className="panel quick-links">
          <div className="eyebrow">LỐI TẮT</div>
          <h2>Bắt đầu từ đây.</h2>
          <Link to="/projects/admin/cars">
            <CarFront size={23} />
            <div>
              <strong>Quản lý xe</strong>
              <small>{count(s.cars)} xe trong hệ thống</small>
            </div>
            <ArrowUpRight size={19} />
          </Link>
          <Link to="/projects/admin/leads">
            <Contact size={23} />
            <div>
              <strong>Yêu cầu khách hàng</strong>
              <small>{count(s.leads)} yêu cầu cần theo dõi</small>
            </div>
            <ArrowUpRight size={19} />
          </Link>
          <p className="muted small">
            Các chỉ số phản ánh xe và yêu cầu khách hàng; đây không phải doanh thu.
          </p>
        </section>
      </div>
    </>
  );
}
