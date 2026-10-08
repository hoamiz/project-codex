import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown, Code2, Layers, Database } from 'lucide-react';
import { api } from '../lib/api';
import { State } from '../components/ui';
interface Project {
  slug: string;
  title: string;
  summary: string;
  description: string;
  stack: string[];
  url: string;
  imagePath: string;
}
export const profile = {
  name: 'Project Codex',
  bio: 'Một portfolio demo khám phá giao diện, tương tác và dữ liệu. Thay thông tin này bằng phần giới thiệu của bạn.',
};
const categories: Record<string, string> = {
  autohub: 'SẢN PHẨM / THƯƠNG MẠI',
  'memory-match': 'TƯƠNG TÁC / TRÒ CHƠI',
  admin: 'DỮ LIỆU / QUẢN TRỊ',
  'room-studio': 'KHÔNG GIAN / SÁNG TẠO',
  'brick-playground': 'LẮP GHÉP / SÂN CHƠI 3D',
};
export function Portfolio() {
  const projects = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api<{ data: Project[] }>('/portfolio/projects'),
  });
  return (
    <>
      <section className="portfolio-hero">
        <div className="eyebrow">
          <span className="status-dot" /> PORTFOLIO · THIẾT KẾ & PHÁT TRIỂN
        </div>
        <h1>
          Ý tưởng thành hình.
          <br />
          <span>Trải nghiệm thành thật.</span>
        </h1>
        <div className="hero-bottom">
          <p>{profile.bio}</p>
          <a className="circle-link" href="#projects" aria-label="Xem các project">
            <ArrowDown />
          </a>
        </div>
        <div className="hero-line">
          <span>REACT / TYPESCRIPT / NODE.JS</span>
          <span>SELECTED WORK · 01—05</span>
        </div>
      </section>
      <section id="projects" className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">KHÁM PHÁ</div>
            <h2>Năm project. Năm trải nghiệm.</h2>
          </div>
          <span className="muted">Xây dựng cùng một nền tảng.</span>
        </div>
        {projects.isPending || projects.isError ? (
          <State
            loading={projects.isPending}
            error={projects.error}
            onRetry={() => void projects.refetch()}
          />
        ) : (
          <div className="project-grid">
            {projects.data?.data.map((p, i) => (
              <Link className={`project-card project-${p.slug}`} to={p.url} key={p.slug}>
                <div className="project-art">
                  {p.slug === 'autohub' ? (
                    <img src={p.imagePath} alt="Xe minh họa bộ sưu tập AutoHub" />
                  ) : p.slug === 'room-studio' ? (
                    <img src={p.imagePath} alt="Phòng minh họa với giường, bàn và cây xanh" />
                  ) : p.slug === 'brick-playground' ? (
                    <img
                      src={p.imagePath}
                      alt="Chân đế và các viên gạch nhiều màu trong Brick Playground"
                    />
                  ) : p.slug === 'memory-match' ? (
                    <div className="memory-art" aria-hidden="true">
                      {['✦', '◈', '◈', '✦', '✧', '✧'].map((s, j) => (
                        <span key={j}>{s}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-art" aria-hidden="true">
                      <div />
                      <section>
                        <i />
                        <i />
                        <i />
                        {[28, 65, 45, 85, 62, 98, 76].map((h, j) => (
                          <span key={j} style={{ height: h }} />
                        ))}
                      </section>
                    </div>
                  )}
                  <span className="project-index">0{i + 1}</span>
                  <span className="art-arrow">
                    <ArrowUpRight />
                  </span>
                </div>
                <div className="project-copy">
                  <div className="eyebrow">{categories[p.slug] || 'PROJECT'}</div>
                  <h3>{p.title}</h3>
                  <p>{p.summary}</p>
                  <div className="tag-row">
                    {p.stack.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="stack-section">
        <div>
          <div className="eyebrow">MỘT HỆ SINH THÁI</div>
          <h2>
            Từ giao diện
            <br />
            đến dữ liệu.
          </h2>
        </div>
        <div className="stack-items">
          {[
            [Code2, 'Frontend', 'React · TypeScript · Tailwind CSS'],
            [Layers, 'Backend', 'Node.js · Express · REST API'],
            [Database, 'Database', 'PostgreSQL · SQL migrations'],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Code2;
            return (
              <div key={String(title)}>
                <I size={24} />
                <section>
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                </section>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
