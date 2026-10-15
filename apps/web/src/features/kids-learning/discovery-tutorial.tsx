import { LearningDialog } from './learning-dialog';
import type { DiscoveryKind } from './discovery-lessons';

/** Mẫu đọc/chạm riêng, không nhận callback bài học hoặc phần thưởng nên không thể đổi tiến độ thật. */
export function DiscoveryTutorial({
  kind,
  onClose,
  returnFocus,
}: {
  kind: DiscoveryKind;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const numbers = kind === 'number-search';
  return (
    <LearningDialog
      title={numbers ? 'Cách chơi tìm số' : 'Cách chơi trốn tìm'}
      onClose={onClose}
      returnFocus={returnFocus}
    >
      <div className="discovery-tutorial-art" aria-hidden="true">
        {numbers ? (
          <>
            <span>1</span>
            <span className="sample-found">1 ✓</span>
            <span>2</span>
          </>
        ) : (
          <>
            <img src="/images/kids-learning/bird.svg" alt="" />
            <span>→</span>
            <img src="/images/kids-learning/scene-jungle.svg" alt="" />
          </>
        )}
      </div>
      <ol className="discovery-tutorial-steps">
        {(numbers
          ? [
              'Chọn khoảng số hoặc nút chọn nhanh, rồi bấm Bắt đầu.',
              'Nghe số cần tìm. Chạm đủ ba số giống nhau trong bảng.',
              'Tìm đúng, số có màu mới. Mình tìm từ nhỏ đến lớn nhé.',
              'Cần giúp đỡ? Gợi ý sẽ khoanh một số, con tự chạm nhé.',
            ]
          : [
              'Chọn chủ đề hoặc để ngẫu nhiên, rồi bấm Bắt đầu.',
              'Chọn hình trên bảng, nghe tên rồi tìm trong bức tranh.',
              'Chạm đúng, hình sáng lên và được đánh dấu đã tìm.',
              'Gợi ý khoanh vùng bạn đang trốn. Tìm đủ để sang màn mới!',
            ]
        ).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <button className="learning-button primary" onClick={onClose}>
        Đã hiểu, cùng thử nào
      </button>
    </LearningDialog>
  );
}
