import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Eye } from 'lucide-react';
import { Button, Modal } from '../../components/ui';
import { DRAFT_KEY, parseDraft, type BrickCatalog } from './brick-core';
import { BrickViewport } from './brick-viewport';
import type { BrickSnapshot } from './brick-editor';
export function BrickViewer({
  catalog,
  snapshot,
}: {
  catalog: BrickCatalog;
  snapshot: BrickSnapshot;
}) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  /** Viewer không ghi nháp; copy cần xác nhận nếu có nháp để tránh thay công trình đang làm âm thầm. */
  const copy = () =>
    navigate('/projects/brick-playground', {
      state: {
        brickCopy: {
          ...structuredClone(snapshot.layout),
          title: `${snapshot.title.slice(0, 69)} (bản sao)`,
        },
      },
    });
  const requestCopy = () => {
    try {
      const draft = parseDraft(localStorage.getItem(DRAFT_KEY), catalog);
      if (draft && (draft.bricks.length || draft.title !== 'Công trình của tôi')) {
        setConfirm(true);
        return;
      }
    } catch {
      /* Storage bị chặn thì không có nháp bền vững để ghi đè. */
    }
    void copy();
  };
  return (
    <>
      <div className="brick-viewer-heading">
        <div>
          <span>
            <Eye size={13} /> BẢN CHIA SẺ · CHỈ XEM
          </span>
          <h2>{snapshot.title}</h2>
          <p>
            {snapshot.layout.bricks.length} gạch · Lưu{' '}
            {new Date(snapshot.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{' '}
            (UTC+7)
          </p>
        </div>
        <Button onClick={requestCopy}>
          <Copy size={14} /> Tạo bản sao
        </Button>
      </div>
      <BrickViewport catalog={catalog} layout={snapshot.layout} readonly />
      {confirm && (
        <Modal title="Thay nháp hiện tại bằng bản sao?" onClose={() => setConfirm(false)}>
          <p>
            Trình duyệt này đã có công trình đang làm. Tạo bản sao sẽ thay nháp đó; bản lưu chia sẻ
            vẫn được giữ nguyên.
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Giữ nháp hiện tại
            </Button>
            <Button onClick={() => void copy()}>Tạo bản sao và thay nháp</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
