import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createApiProxy, readProxyConfig } from '../../api/proxy.mjs';
const secret = randomBytes(48).toString('hex');
async function server(handler, run) {
  const service = createServer(handler);
  await new Promise((resolve) => service.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${service.address().port}`);
  } finally {
    service.closeAllConnections();
    await new Promise((resolve) => service.close(resolve));
  }
}
test('proxy config requires HTTPS/scoped origin and strong server-only secret', () => {
  assert.throws(() =>
    readProxyConfig({ API_BACKEND_URL: 'http://remote.example', API_PROXY_SECRET: secret }),
  );
  assert.throws(() =>
    readProxyConfig({
      API_BACKEND_URL: 'https://user:password@remote.example',
      API_PROXY_SECRET: secret,
    }),
  );
  assert.throws(() =>
    readProxyConfig({ API_BACKEND_URL: 'https://remote.example/api', API_PROXY_SECRET: secret }),
  );
  assert.throws(() =>
    readProxyConfig({ API_BACKEND_URL: 'https://remote.example', API_PROXY_SECRET: 'short' }),
  );
  assert.equal(
    readProxyConfig({ API_BACKEND_URL: 'https://service.onrender.com', API_PROXY_SECRET: secret })
      .origin,
    'https://service.onrender.com',
  );
});
test('gateway forwards query/body/cookies/tokens once, strips spoofed headers and preserves Set-Cookie', async () => {
  let seen,
    count = 0;
  await server(
    async (req, res) => {
      count++;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      seen = { url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Set-Cookie', ['one=1; Secure; HttpOnly', 'two=2; Secure; SameSite=Lax']);
      res.statusCode = 201;
      res.end('{"data":{"ok":true}}');
    },
    async (backend) => {
      await server(
        createApiProxy({
          ...readProxyConfig({
            NODE_ENV: 'test',
            API_BACKEND_URL: backend,
            API_PROXY_SECRET: secret,
          }),
          timeoutMs: 1000,
        }),
        async (frontend) => {
          const response = await fetch(
            `${frontend}/api/proxy.mjs?__codex_path=bricks/designs&search=hello%20world`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Vercel-Forwarded-For': '198.51.100.7',
                'X-Forwarded-For': 'attacker',
                'X-Codex-Proxy-Token': 'attacker',
                'X-Codex-Client-IP': 'attacker',
                Cookie: 'codex.sid=fixture',
                Origin: 'https://portfolio.example',
                'Idempotency-Key': 'fixture-key',
                'X-CSRF-Token': 'fixture-csrf',
              },
              body: '{"layout":{}}',
            },
          );
          assert.equal(response.status, 201);
          assert.equal(response.headers.getSetCookie().length, 2);
          assert.equal(response.headers.get('Cache-Control'), 'no-store');
          await response.text();
        },
      );
    },
  );
  assert.equal(count, 1);
  assert.equal(seen.url, '/api/bricks/designs?search=hello+world');
  assert.equal(seen.body, '{"layout":{}}');
  assert.equal(seen.headers['x-codex-proxy-token'], secret);
  assert.equal(seen.headers['x-codex-client-ip'], '198.51.100.7');
  assert.equal(seen.headers['x-forwarded-for'], undefined);
  assert.equal(seen.headers.cookie, 'codex.sid=fixture');
  assert.equal(seen.headers.origin, 'https://portfolio.example');
  assert.equal(seen.headers['x-csrf-token'], 'fixture-csrf');
});
test('proxy rejects traversal, duplicate internal path, huge body and unsupported methods before upstream', async () => {
  let count = 0;
  const config = readProxyConfig({
    API_BACKEND_URL: 'https://service.onrender.com',
    API_PROXY_SECRET: secret,
  });
  await server(
    createApiProxy(config, async () => {
      count++;
      return new Response('{}');
    }),
    async (frontend) => {
      for (const [suffix, status] of [
        ['?__codex_path=../health', 400],
        ['?__codex_path=health&__codex_path=other', 400],
        ['?__codex_path=https://attacker.example', 400],
      ])
        assert.equal(
          (
            await fetch(`${frontend}/api/proxy.mjs${suffix}`, {
              headers: { 'X-Vercel-Forwarded-For': '198.51.100.7' },
            })
          ).status,
          status,
        );
      assert.equal(
        (await fetch(`${frontend}/api/proxy.mjs?__codex_path=health`, { method: 'OPTIONS' }))
          .status,
        405,
      );
      assert.equal((await fetch(`${frontend}/api/proxy.mjs?__codex_path=health`)).status, 503);
      assert.equal(
        (
          await fetch(`${frontend}/api/proxy.mjs?__codex_path=bricks/designs`, {
            method: 'POST',
            headers: { 'X-Vercel-Forwarded-For': '198.51.100.7' },
            body: 'x'.repeat(33000),
          })
        ).status,
        413,
      );
    },
  );
  assert.equal(count, 0);
});
test('upstream HTML stays HTML, redirect is rejected and timeout fails safely', async () => {
  const config = {
    ...readProxyConfig({
      API_BACKEND_URL: 'https://service.onrender.com',
      API_PROXY_SECRET: secret,
    }),
    timeoutMs: 20,
  };
  for (const [fetcher, status, contentType] of [
    [
      async () =>
        new Response('<html>starting</html>', { headers: { 'Content-Type': 'text/html' } }),
      200,
      'text/html',
    ],
    [
      async () =>
        new Response(null, { status: 302, headers: { Location: 'https://attacker.example' } }),
      502,
      'application/json',
    ],
    [
      async (_url, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('timeout'))),
        ),
      503,
      'application/json',
    ],
  ])
    await server(createApiProxy(config, fetcher), async (frontend) => {
      const response = await fetch(`${frontend}/api/proxy.mjs?__codex_path=health`, {
        headers: { 'X-Vercel-Forwarded-For': '2001:db8::1' },
      });
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Content-Type'), contentType);
      assert(!(await response.text()).includes(secret));
    });
});
