import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { alphabet, exampleParts, withoutTone, spokenText } from './alphabet-data';

test('exactly29 Vietnamese letters in order, unique files, familiar examples contain their letter', () => {
  expect(alphabet.map((x) => x.letter).join('')).toBe('aăâbcdđeêghiklmnoôơpqrstuưvxy');
  expect(new Set(alphabet.map((x) => x.id)).size).toBe(29);
  expect(alphabet.map((letter) => letter.sound)).toEqual([
    'a',
    'á',
    'ớ',
    'bờ',
    'cờ',
    'dờ',
    'đờ',
    'e',
    'ê',
    'gờ',
    'hờ',
    'i',
    'ca',
    'lờ',
    'mờ',
    'nờ',
    'o',
    'ô',
    'ơ',
    'pờ',
    'cu',
    'rờ',
    'sờ',
    'tờ',
    'u',
    'ư',
    'vờ',
    'xờ',
    'i',
  ]);
  for (const letter of alphabet) {
    expect(
      exampleParts(letter).some((part) => part.highlight),
      letter.letter,
    ).toBe(true);
    expect(letter.id).toMatch(/^[a-z]+(?:-[a-z]+)?$/);
  }
});
test('highlighting strips tones while distinguishing all Vietnamese vowel variants', () => {
  expect(withoutTone('cặp gấu ếch cổng cờ sư tử')).toBe('căp gâu êch công cơ sư tư');
  for (const [letter, text] of [
    ['ă', 'ặ'],
    ['â', 'ấ'],
    ['ơ', 'ờ'],
    ['ư', 'ử'],
    ['ê', 'ế'],
    ['ô', 'ổ'],
  ]) {
    expect(
      exampleParts({ id: 'fixture', sound: letter, letter, example: text }).filter(
        (x) => x.highlight,
      ),
    ).toHaveLength(1);
    expect(
      exampleParts({ id: 'fixture', sound: 'a', letter: 'a', example: text }).some(
        (x) => x.highlight,
      ),
    ).toBe(false);
  }
});
test('every illustration/audio exists with matching Vietnamese transcript and intact checksum', () => {
  const media = join(process.cwd(), 'public/audio/vietnamese-alphabet');
  const manifest = JSON.parse(readFileSync(join(media, 'manifest.json'), 'utf8'));
  expect(manifest.voice).toBe('vi-VN-HoaiMyNeural');
  expect(manifest.language).toBe('vi-VN');
  expect(manifest.readingMode).toBe('phonics');
  expect(manifest.clips[0].transcript).toBe('a. cái ca.');
  expect(manifest.clips.find((clip: { id: string }) => clip.id === 'b').transcript).toBe(
    'bờ. con bò.',
  );
  for (const [id, expected] of [
    ['h', 'hờ. con hổ.'],
    ['k', 'ca. cái kẹo.'],
    ['q', 'cu. quả quýt.'],
    ['s', 'sờ. con sóc.'],
    ['x', 'xờ. xe đạp.'],
  ]) {
    const clip = manifest.clips.find((item: { id: string }) => item.id === id);
    expect(clip.transcript).toBe(expected);
    expect(clip.pauseMs).toBe(400);
    if (['h', 's', 'x'].includes(id)) expect(clip.soundRate).toBe('-30%');
  }
  expect(manifest.clips.map((x: { id: string }) => x.id)).toEqual(alphabet.map((x) => x.id));
  expect(readdirSync(media).filter((x) => x.endsWith('.mp3'))).toHaveLength(29);
  for (const [i, letter] of alphabet.entries()) {
    const clip = manifest.clips[i];
    expect(clip.transcript).toBe(spokenText(letter));
    expect(clip.transcript).not.toMatch(/chữ|ví dụ/i);
    expect(clip.durationSeconds).toBeGreaterThan(1);
    expect(clip.durationSeconds).toBeLessThan(15);
    const audio = readFileSync(join(media, `${letter.id}.mp3`));
    expect(createHash('sha256').update(audio).digest('hex')).toBe(clip.sha256);
    const image = readFileSync(
      join(process.cwd(), `public/images/alphabet/${letter.id}.svg`),
      'utf8',
    );
    expect(image).toContain(`<title>${letter.example}</title>`);
    expect(image).not.toMatch(/https?:\/\/[^" ]+\.(?:png|jpg)|<script|onload=/i);
  }
});
