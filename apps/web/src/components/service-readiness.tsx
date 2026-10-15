import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layers, LoaderCircle, RefreshCw, WifiOff, ArrowRight } from 'lucide-react';
import {
  checkServiceHealth,
  createReadinessMonitor,
  type ReadinessState,
} from '../lib/service-readiness';
import './service-readiness.css';

/** Chỉ gate lần kết nối đầu. Khi đã vào app, banner giữ nguyên cây component/form/draft; hồi phục chỉ refetch query đọc. */
export function ServiceReadiness({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [state, setState] = useState<ReadinessState>({
    phase: 'checking',
    elapsedSeconds: 0,
    hadReady: false,
  });
  const [retry, setRetry] = useState<() => void>(() => () => {});
  useEffect(() => {
    const monitor = createReadinessMonitor({
      check: checkServiceHealth,
      onChange: setState,
      onRecovered: () => {
        void client.refetchQueries({ type: 'active' });
      },
    });
    setRetry(() => monitor.retry);
    const unavailable = () => monitor.unavailable();
    const offline = () => monitor.offline();
    const online = () => monitor.resume();
    const visibility = () => monitor.visibility();
    window.addEventListener('codex:service-unavailable', unavailable);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visibility);
    monitor.start();
    return () => {
      monitor.dispose();
      window.removeEventListener('codex:service-unavailable', unavailable);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [client]);
  const failed = state.phase === 'timeout',
    offline = state.phase === 'offline';
  const waiting = state.phase !== 'ready';
  const title = offline
    ? 'Bạn đang ngoại tuyến.'
    : failed
      ? 'Chưa kết nối được dịch vụ.'
      : state.hadReady
        ? 'Đang kết nối lại dịch vụ…'
        : 'Một chút chờ. Nhiều trải nghiệm.';
  return (
    <>
      {waiting &&
        (state.hadReady ? (
          <aside className="service-banner" aria-label="Trạng thái kết nối dịch vụ">
            <span role="status">
              {offline ? (
                <WifiOff size={17} />
              ) : (
                <LoaderCircle className={failed ? '' : 'spin'} size={17} />
              )}{' '}
              {title} Dữ liệu đang nhập vẫn được giữ.
            </span>
            {(failed || offline) && (
              <button type="button" onClick={retry}>
                Kết nối lại <RefreshCw size={14} />
              </button>
            )}
          </aside>
        ) : (
          <main className="service-wait" id="main">
            <header>
              <span className="service-brand">
                <Layers size={22} /> project<span>codex.</span>
              </span>
              <span className="service-tag">PORTFOLIO / BẢY TRẢI NGHIỆM</span>
            </header>
            <section className="service-wait-content">
              <div className="service-eyebrow">CHUẨN BỊ KHÁM PHÁ</div>
              <h1>{title}</h1>
              <p>
                {offline
                  ? 'Kiểm tra kết nối mạng của bạn. Chúng tôi sẽ thử lại khi mạng trở lại.'
                  : failed
                    ? 'Dịch vụ chưa phản hồi. Bạn có thể thử kết nối lại.'
                    : 'Đang kết nối dịch vụ. Lần truy cập đầu có thể cần khoảng một phút.'}
              </p>
              <div className="service-status" role="status" aria-live="polite">
                {offline ? <WifiOff /> : <LoaderCircle className={failed ? '' : 'spin'} />}
                <div>
                  <strong>
                    {offline
                      ? 'Chờ kết nối mạng'
                      : failed
                        ? 'Lượt chờ đã kết thúc'
                        : 'Đang chuẩn bị dữ liệu'}
                  </strong>
                  <span>
                    {!failed && !offline
                      ? 'Trang sẽ tự mở khi dịch vụ sẵn sàng.'
                      : 'Đường dẫn bạn đang mở vẫn được giữ.'}
                  </span>
                </div>
              </div>
              <div className="service-actions">
                {(failed || offline) && (
                  <button className="btn btn-primary" type="button" onClick={retry}>
                    Thử lại <RefreshCw size={17} />
                  </button>
                )}
                {!failed && !offline && (
                  <span className="service-elapsed" aria-hidden="true">
                    ĐÃ CHỜ {state.elapsedSeconds}s
                  </span>
                )}
                <span className="service-assurance">
                  Tự động kết nối <ArrowRight size={15} />
                </span>
              </div>
            </section>
            <div className="service-projects" aria-label="Các trải nghiệm trong portfolio">
              {[
                'AutoHub',
                'Memory Match',
                'Control Center',
                'Room Studio 3D',
                'Brick Playground',
                'Bé vui học chữ',
                'Bé vui học tập',
              ].map((name, index) => (
                <span key={name}>
                  <small>0{index + 1}</small>
                  {name}
                </span>
              ))}
            </div>
            <footer>PROJECT CODEX · REACT / TYPESCRIPT / NODE.JS</footer>
          </main>
        ))}
      {state.hadReady ? children : null}
    </>
  );
}
