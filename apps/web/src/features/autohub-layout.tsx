import { ArrowLeft, ArrowUpRight, CarFront, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AutoHubHeader() {
  return (
    <header className="autohub-header">
      <div className="autohub-header-inner">
        <Link className="autohub-brand" to="/projects/autohub" aria-label="AutoHub — trang chủ">
          <span className="autohub-brand-icon">
            <CarFront size={25} />
          </span>
          auto<span>hub</span>
          <span className="autohub-brand-dot">.</span>
        </Link>
        <nav aria-label="Điều hướng AutoHub">
          <Link className="autohub-nav-cars" to="/projects/autohub#cars">
            Tìm xe <ChevronRight size={14} />
          </Link>
          <Link className="autohub-nav-guide" to="/projects/autohub#buy-guide">
            Hướng dẫn mua xe
          </Link>
        </nav>
        <Link className="autohub-portfolio" to="/">
          <ArrowLeft size={15} /> Về portfolio
        </Link>
      </div>
    </header>
  );
}

export function AutoHubFooter() {
  return (
    <footer className="autohub-footer">
      <div className="autohub-footer-inner">
        <div>
          <Link className="autohub-brand" to="/projects/autohub">
            <CarFront size={26} /> auto<span>hub.</span>
          </Link>
          <p>Chọn chiếc xe. Mở một hành trình.</p>
          <small>Demo portfolio · Hình ảnh và giá xe mang tính minh họa.</small>
        </div>
        <nav aria-label="Liên kết AutoHub">
          <Link to="/projects/autohub#cars">
            Khám phá xe <ChevronRight size={15} />
          </Link>
          <Link to="/projects/autohub#buy-guide">
            Cách mua xe tại AutoHub <ChevronRight size={15} />
          </Link>
          <Link to="/">
            Khám phá project-codex <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
      <div className="autohub-footer-bottom">© 2026 AutoHub · Một project của project-codex</div>
    </footer>
  );
}
