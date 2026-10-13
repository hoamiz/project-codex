import { test, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from './api';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
test('network failure and HTML startup emit recovery signal without retrying mutations', async () => {
  const dispatch = vi.spyOn(window, 'dispatchEvent');
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(new Response('<html>starting</html>', { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  for (let i = 0; i < 2; i++)
    await expect(api('/bricks/designs', { method: 'POST', body: '{}' })).rejects.toBeInstanceOf(
      ApiError,
    );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(dispatch.mock.calls.every(([event]) => event.type === 'codex:service-unavailable')).toBe(
    true,
  );
});
test('validation errors remain field errors and do not announce unavailable service', async () => {
  const dispatch = vi.spyOn(window, 'dispatchEvent');
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Sai dữ liệu', fields: { title: ['Quá ngắn'] } } }),
          { status: 400 },
        ),
      ),
  );
  await expect(api('/bricks/designs', { method: 'POST' })).rejects.toMatchObject({
    status: 400,
    fields: { title: ['Quá ngắn'] },
  });
  expect(dispatch).not.toHaveBeenCalled();
});
