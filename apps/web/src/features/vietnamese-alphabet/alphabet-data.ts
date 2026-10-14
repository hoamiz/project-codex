import catalog from './alphabet.json' with { type: 'json' };

export const alphabet = catalog;
export type Letter = (typeof alphabet)[number];
export const illustrationUrl = (letter: Letter) => `/images/alphabet/${letter.id}.svg`;
// Đổi revision khi thay lời đọc để trình duyệt không phát lại file audio cũ từ cache.
export const audioUrl = (letter: Letter) => `/audio/vietnamese-alphabet/${letter.id}.mp3?v=7`;
/** Dùng bảng âm đã chốt với người dùng: k đọc ca, q đọc cu; không thêm lời dẫn. */
export const spokenText = (letter: Letter) => `${letter.sound}. ${letter.example}.`;

/** Bỏ riêng dấu thanh; giữ breve/circumflex/horn để không nhầm a/ă/â hoặc o/ô/ơ. */
export function withoutTone(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '')
    .normalize('NFC');
}

/** Đối chiếu từng ký tự NFC để tô đúng chữ trong ví dụ có dấu, không đổi cách viết từ. */
export function exampleParts(letter: Letter) {
  return Array.from(letter.example.normalize('NFC')).map((text) => ({
    text,
    highlight: withoutTone(text.toLocaleLowerCase('vi')) === letter.letter,
  }));
}
