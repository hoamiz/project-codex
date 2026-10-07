import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowUpRight, ArrowLeft, Layers } from 'lucide-react';
import { Portfolio } from './features/portfolio';
import { AutoHub, CarDetail, Compare } from './features/autohub';
import { AutoHubHeader, AutoHubFooter } from './features/autohub-layout';
import { MemoryMatch } from './features/memory-match';
import { AdminLayout, Login } from './features/admin-auth';
import { AdminCars } from './features/admin-cars';
import { AdminLeads } from './features/admin-leads';
import { Dashboard } from './features/admin-dashboard';
import './styles.css';
import './features/autohub.css';
import { State } from './components/ui';
const RoomStudio = lazy(() => import('./features/room-studio'));
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
function App() {
  const location = useLocation();
  const home = location.pathname === '/';
  const autoHub =
    location.pathname === '/projects/autohub' || location.pathname.startsWith('/projects/autohub/');
  return (
    <div className={autoHub ? 'autohub-page' : undefined}>
      <a className="skip-link" href="#main">
        Đến nội dung
      </a>
      {autoHub ? (
        <AutoHubHeader />
      ) : (
        <header className="site-header">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <Layers size={19} />
            </span>
            project<span className="brand-light">codex</span>
            <span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Điều hướng chính">
            {home ? (
              <>
                <a href="#projects">Project</a>
                <span className="header-pill">
                  SẴN SÀNG KHÁM PHÁ <span className="status-dot" />
                </span>
              </>
            ) : (
              <>
                <Link to="/">
                  <ArrowLeft size={14} />
                  Portfolio
                </Link>
                <Link to="/projects/autohub">AutoHub</Link>
                <Link to="/projects/memory-match">Game</Link>
              </>
            )}
          </nav>
        </header>
      )}
      <main id="main">
        <Routes>
          <Route path="/" element={<Portfolio />} />
          <Route path="/projects/autohub" element={<AutoHub />} />
          <Route path="/projects/autohub/cars/:slug" element={<CarDetail />} />
          <Route path="/projects/autohub/compare" element={<Compare />} />
          <Route path="/projects/memory-match" element={<MemoryMatch />} />
          <Route
            path="/projects/room-studio"
            element={
              <Suspense fallback={<State loading />}>
                <RoomStudio />
              </Suspense>
            }
          />
          <Route
            path="/projects/room-studio/view/:id"
            element={
              <Suspense fallback={<State loading />}>
                <RoomStudio />
              </Suspense>
            }
          />
          <Route path="/projects/admin/login" element={<Login />} />
          <Route path="/projects/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cars" element={<AdminCars />} />
            <Route path="leads" element={<AdminLeads />} />
          </Route>
          <Route
            path="*"
            element={
              <section className="section">
                <div className="eyebrow">404</div>
                <h1>Trang không tồn tại.</h1>
                <Link className="btn btn-primary" to="/">
                  Về portfolio <ArrowUpRight size={18} />
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      {autoHub ? (
        <AutoHubFooter />
      ) : (
        <footer className="site-footer">
          <span>PROJECT CODEX · PORTFOLIO DEMO</span>
          <Link to="/">
            Thiết kế để trải nghiệm. <ArrowUpRight size={14} />
          </Link>
          <span>2026</span>
        </footer>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
