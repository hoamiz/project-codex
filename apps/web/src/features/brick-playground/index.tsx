import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Blocks } from 'lucide-react';
import { api } from '../../lib/api';
import { State } from '../../components/ui';
import { layoutError, type BrickCatalog } from './brick-core';
import { BrickEditor, type BrickSnapshot } from './brick-editor';
import { BrickViewer } from './brick-viewer';
import './brick-playground.css';

function Heading() {
  return (
    <header className="brick-heading">
      <div>
        <Link to="/" className="brick-back">
          <ArrowLeft size={13} /> VỀ PORTFOLIO
        </Link>
        <div className="brick-kicker">
          <Blocks size={15} /> PLAY / BUILD / REPEAT
        </div>
        <h1>
          Brick Playground <span>3D</span>
          <i>✦</i>
        </h1>
        <p>Từng viên gạch. Một thế giới mới. Bắt đầu bằng một màu bạn thích.</p>
      </div>
      <span className="brick-heading-badge">
        TỰ DO SÁNG TẠO
        <br />
        <strong>32 × 32</strong> NÚT
      </span>
    </header>
  );
}
export default function BrickPlayground() {
  const { id } = useParams();
  const catalog = useQuery({
    queryKey: ['brick-catalog'],
    queryFn: ({ signal }) => api<{ data: BrickCatalog }>('/bricks/catalog', { signal }),
    staleTime: 5 * 60 * 1000,
  });
  const snapshot = useQuery({
    queryKey: ['brick-snapshot', id],
    queryFn: ({ signal }) => api<{ data: BrickSnapshot }>(`/bricks/designs/${id}`, { signal }),
    enabled: !!id,
  });
  const pending = catalog.isPending || (!!id && snapshot.isPending);
  const error = catalog.error || (id ? snapshot.error : null);
  return (
    <div className="brick-playground">
      <Heading />
      {pending || error ? (
        <State
          loading={pending}
          error={error}
          onRetry={() => {
            void catalog.refetch();
            if (id) void snapshot.refetch();
          }}
        />
      ) : catalog.data ? (
        id ? (
          snapshot.data && !layoutError(snapshot.data.data.layout, catalog.data.data) ? (
            <BrickViewer catalog={catalog.data.data} snapshot={snapshot.data.data} />
          ) : (
            <State error={new Error('Công trình không tương thích.')} />
          )
        ) : (
          <BrickEditor catalog={catalog.data.data} />
        )
      ) : null}
    </div>
  );
}
