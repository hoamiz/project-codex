import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CarFront,
  Contact,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { api, setCsrf } from '../lib/api';
import { Button, Field, State } from '../components/ui';
interface Auth {
  email: string;
  csrfToken: string;
}
/** Khôi phục CSRF từ session sau reload; dữ liệu được bảo vệ chỉ được render khi API xác nhận quyền. */
export function AdminLayout() {
  const location = useLocation(),
    navigate = useNavigate(),
    client = useQueryClient();
  const me = useQuery({
    queryKey: ['auth'],
    retry: false,
    queryFn: async () => {
      const r = await api<{ data: Auth }>('/auth/me');
      setCsrf(r.data.csrfToken);
      return r.data;
    },
  });
  useEffect(() => {
    const expired = () => {
      setCsrf('');
      client.clear();
      navigate('/projects/admin/login', { replace: true });
    };
    window.addEventListener('codex:unauthorized', expired);
    return () => window.removeEventListener('codex:unauthorized', expired);
  }, [client, navigate]);
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      setCsrf('');
      client.clear();
      navigate('/projects/admin/login');
    },
  });
  if (me.isPending) return <State loading />;
  if (me.isError)
    return <Navigate to="/projects/admin/login" state={{ from: location.pathname }} replace />;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-identity">
          <span>
            <ShieldCheck size={21} />
          </span>
          <div>
            <strong>Control Center</strong>
            <small>QUẢN TRỊ AUTOHUB</small>
          </div>
        </div>
        <nav aria-label="Admin">
          <NavLink end to="/projects/admin">
            <LayoutDashboard size={18} />
            Tổng quan
          </NavLink>
          <NavLink to="/projects/admin/cars">
            <CarFront size={18} />
            Quản lý xe
          </NavLink>
          <NavLink to="/projects/admin/leads">
            <Contact size={18} />
            Yêu cầu khách hàng
          </NavLink>
        </nav>
        <div className="admin-user">
          <small>{me.data.email}</small>
          <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut size={16} />
            Đăng xuất
          </Button>
          {logout.error && <p role="alert">{logout.error.message}</p>}
          <Link to="/projects/autohub">
            Xem AutoHub <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
export function Login() {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const navigate = useNavigate(),
    location = useLocation(),
    client = useQueryClient();
  const login = useMutation({
    mutationFn: () =>
      api<{ data: Auth }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (r) => {
      setCsrf(r.data.csrfToken);
      client.setQueryData(['auth'], r.data);
      const from = (location.state as { from?: string } | null)?.from;
      const safe =
        from && /^\/projects\/admin(?:\/|$)/.test(from) && !from.endsWith('/login')
          ? from
          : '/projects/admin';
      navigate(safe, { replace: true });
    },
  });
  return (
    <section className="login-section">
      <div className="login-art">
        <div className="eyebrow">CONTROL CENTER</div>
        <h1>
          Mọi thứ
          <br />
          trong tầm
          <br />
          <em>kiểm soát.</em>
        </h1>
        <p>
          Một góc nhìn rõ ràng cho xe, khách hàng
          <br />
          và những hành trình sắp tới.
        </p>
        <ShieldCheck size={48} />
      </div>
      <div className="login-form">
        <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
        <h2>Đăng nhập quản trị.</h2>
        <p className="muted small">Sử dụng tài khoản admin đã được khởi tạo cục bộ.</p>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate();
          }}
        >
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mật khẩu">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {login.error && (
            <p className="notice error-notice" role="alert">
              {login.error.message}
            </p>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            <ArrowUpRight size={17} />
          </Button>
        </form>
        <Link className="back-link" to="/">
          Quay về portfolio
        </Link>
      </div>
    </section>
  );
}
