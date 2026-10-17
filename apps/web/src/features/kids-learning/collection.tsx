import { stickerIds } from './lessons';
import { learningImage } from './learning-assets';
import { LearningDialog } from './learning-dialog';
import { stickerNames, type StickerId } from './rewards-core';
export function Collection({
  ids,
  onClose,
  returnFocus,
  sessionOnly,
}: {
  ids: StickerId[];
  onClose: () => void;
  returnFocus?: HTMLElement | null;
  sessionOnly: boolean;
}) {
  return (
    <LearningDialog title="Những người bạn của con" onClose={onClose} returnFocus={returnFocus}>
      <p>
        Mỗi bài hoàn thành, một người bạn mới! <strong>{ids.length}/12</strong>
      </p>
      {sessionOnly && <p>Sticker đang được giữ trong phiên chơi này nhé.</p>}
      <div className="learning-collection">
        {stickerIds.map((id) => (
          <div
            className={`collection-sticker ${ids.includes(id) ? 'unlocked' : 'locked'}`}
            key={id}
          >
            {ids.includes(id) ? (
              <>
                <img src={learningImage(id)} alt={stickerNames[id]} />
                <span>{stickerNames[id]}</span>
              </>
            ) : (
              <>
                <span className="sticker-mystery" aria-hidden="true">
                  ?
                </span>
                <span>Chưa khám phá</span>
              </>
            )}
          </div>
        ))}
      </div>
      <button className="learning-button primary" onClick={onClose}>
        Cùng chơi tiếp →
      </button>
    </LearningDialog>
  );
}
