import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, Pagination } from './ui';
test('modal keyboard focus wraps and Escape closes', async () => {
  const close = vi.fn();
  render(
    <Modal title="Form" onClose={close}>
      <input aria-label="Tên" />
      <button>Lưu</button>
    </Modal>,
  );
  const user = userEvent.setup();
  await user.tab({ shift: true });
  expect(screen.getByText('Lưu')).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Đóng' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(close).toHaveBeenCalledOnce();
});
test('pagination disables invalid navigation', async () => {
  const change = vi.fn();
  render(<Pagination page={1} totalPages={2} onChange={change} />);
  expect(screen.getByRole('button', { name: 'Trước' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: /Sau/ }));
  expect(change).toHaveBeenCalledWith(2);
});
