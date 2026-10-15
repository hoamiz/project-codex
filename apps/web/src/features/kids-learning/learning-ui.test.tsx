import { test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RangeSettings } from './range-settings';
import { CountHelper } from './count-helper';

test('L09 drafting 10 and blur/Enter never submits stale range', async () => {
  const starts: unknown[] = [];
  render(<RangeSettings onStart={(r) => starts.push(r)} />);
  const end = screen.getByLabelText('Đến số');
  await userEvent.clear(end);
  await userEvent.type(end, '10');
  expect(end).toHaveValue(10);
  expect(starts).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }));
  expect(starts).toEqual([{ start: 1, end: 10 }]);
  const start = screen.getByLabelText('Từ số');
  await userEvent.clear(start);
  await userEvent.type(start, '10');
  await userEvent.keyboard('{Enter}');
  expect(start).toHaveValue(9);
  expect(starts).toHaveLength(1);
  fireEvent.change(end, { target: { value: '1' } });
  await userEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }));
  expect(starts.at(-1)).toEqual({ start: 9, end: 10 });
});

test('L22 repeated taps count each picture only once and reset is local', async () => {
  render(
    <>
      <CountHelper count={3} shape="star" />
      <CountHelper count={2} shape="fish" />
    </>,
  );
  const first = screen.getByRole('button', { name: 'Đếm hình 1 trong nhóm 3' });
  await userEvent.click(first);
  await userEvent.click(first);
  expect(first).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Đếm lại nhóm 3' })).toHaveTextContent('Đã đếm 1');
  await userEvent.click(screen.getByRole('button', { name: 'Đếm hình 1 trong nhóm 2' }));
  await userEvent.click(screen.getByRole('button', { name: 'Đếm lại nhóm 3' }));
  expect(screen.getByRole('button', { name: 'Đếm lại nhóm 3' })).toHaveTextContent(
    'Chạm hình để đếm',
  );
  expect(screen.getByRole('button', { name: 'Đếm lại nhóm 2' })).toHaveTextContent('Đã đếm 1');
});
test('L24 presets atomically replace a dirty field and do not start a round', async () => {
  const starts: unknown[] = [];
  render(<RangeSettings onStart={(r) => starts.push(r)} />);
  const start = screen.getByLabelText('Từ số'),
    end = screen.getByLabelText('Đến số');
  await userEvent.clear(start);
  await userEvent.type(start, '9');
  await userEvent.click(screen.getByRole('button', { name: '1–10' }));
  fireEvent.blur(start);
  expect(start).toHaveValue(1);
  expect(end).toHaveValue(10);
  expect(starts).toHaveLength(0);
  await userEvent.clear(start);
  await userEvent.type(start, '10');
  await userEvent.tab();
  expect(start).toHaveValue(9);
  for (const n of [3, 5, 10]) {
    await userEvent.click(screen.getByRole('button', { name: `1–${n}` }));
    expect(start).toHaveValue(1);
    expect(end).toHaveValue(n);
  }
  await userEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }));
  expect(starts).toEqual([{ start: 1, end: 10 }]);
});
test('L09 invalid blank only changes the edited field', async () => {
  render(<RangeSettings onStart={() => {}} />);
  const start = screen.getByLabelText('Từ số');
  await userEvent.clear(start);
  await userEvent.tab();
  expect(start).toHaveValue(4);
  expect(screen.getByLabelText('Đến số')).toHaveValue(5);
});
