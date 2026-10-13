import { isIP } from 'node:net';

/** URL upstream chỉ lấy từ cấu hình server; frontend/browser không được chọn đích proxy hoặc nhận secret. */
export function readProxyConfig(env) {
  let origin;
  try {
    origin = new URL(env.API_BACKEND_URL || '');
  } catch {
    throw new Error('Missing API_BACKEND_URL');
  }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  if (
    (origin.protocol !== 'https:' &&
      !(env.NODE_ENV === 'test' && local && origin.protocol === 'http:')) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Invalid API_BACKEND_URL');
  if (!env.API_PROXY_SECRET || env.API_PROXY_SECRET.length < 32)
    throw new Error('Missing API_PROXY_SECRET');
  return {
    origin: origin.origin,
    secret: env.API_PROXY_SECRET,
    timeoutMs: 45000,
    local: env.NODE_ENV === 'test' && local,
  };
}

/** Đọc body có giới hạn32KB; hỗ trợ body Vercel đã parse hoặc raw IncomingMessage khi kiểm tra bằng server thật. */
async function readBody(req) {
  if (req.body !== undefined) {
    const value = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    if (value.length > 32768) throw new Error('BODY_LIMIT');
    return value;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw new Error('BODY_LIMIT');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Gateway gửi IP do Vercel cấp và token riêng; không nhận forwarded/proxy headers của client. Cookies và mutation được chuyển đúng một lần. */
export function createApiProxy(config, fetcher = fetch) {
  return async (req, res) => {
    const fail = (status, message) => {
      if (!res.writableEnded) {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify({
            error: { code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNAVAILABLE', message },
          }),
        );
      }
    };
    const method = req.method || 'GET';
    if (!['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'].includes(method))
      return fail(405, 'Phương thức không được hỗ trợ.');
    try {
      const request = new URL(req.url, 'https://frontend.invalid');
      const internal = request.searchParams.getAll('__codex_path');
      const rawPath = internal.length ? internal[0] : request.pathname.replace(/^\/api\/?/, '');
      if (
        internal.length > 1 ||
        !rawPath ||
        rawPath
          .split('/')
          .some((part) => !part || part === '.' || part === '..' || !/^[A-Za-z0-9_-]+$/.test(part))
      )
        return fail(400, 'Đường dẫn API không hợp lệ.');
      request.searchParams.delete('__codex_path');
      const target = new URL(`/api/${rawPath}`, config.origin);
      target.search = request.searchParams.toString();
      const rawIp = req.headers['x-vercel-forwarded-for'];
      const ip =
        typeof rawIp === 'string'
          ? rawIp.trim()
          : config.local
            ? req.socket.remoteAddress?.replace(/^::ffff:/, '')
            : '';
      if (!isIP(ip || '')) return fail(503, 'Không xác định được kết nối dịch vụ.');
      const headers = new Headers({
        'X-Codex-Proxy-Token': config.secret,
        'X-Codex-Client-IP': ip,
        Accept: 'application/json',
      });
      for (const name of [
        'content-type',
        'cookie',
        'origin',
        'x-csrf-token',
        'idempotency-key',
        'x-game-token',
      ]) {
        const value = req.headers[name];
        if (typeof value === 'string') headers.set(name, value);
      }
      const body = ['POST', 'PATCH', 'DELETE'].includes(method) ? await readBody(req) : undefined;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      const close = () => controller.abort();
      res.once('close', close);
      try {
        const response = await fetcher(target, {
          method,
          headers,
          body: body?.length ? body : undefined,
          signal: controller.signal,
          redirect: 'manual',
        });
        // API không redirect sang origin khác; HTML cold-start được giữ nguyên để readiness không nhận nhầm JSON200.
        if (response.status >= 300 && response.status < 400)
          return fail(502, 'Dịch vụ chưa sẵn sàng.');
        const output = Buffer.from(await response.arrayBuffer());
        if (res.destroyed) return;
        res.statusCode = response.status;
        for (const name of ['content-type', 'retry-after', 'ratelimit', 'ratelimit-policy']) {
          const value = response.headers.get(name);
          if (value) res.setHeader(name, value);
        }
        const cookies = response.headers.getSetCookie();
        if (cookies.length) res.setHeader('Set-Cookie', cookies);
        res.setHeader('Cache-Control', 'no-store');
        res.end(method === 'HEAD' ? undefined : output);
      } finally {
        clearTimeout(timeout);
        res.removeListener('close', close);
      }
    } catch (error) {
      fail(error?.message === 'BODY_LIMIT' ? 413 : 503, 'Dịch vụ chưa phản hồi. Vui lòng thử lại.');
    }
  };
}

export default async function handler(req, res) {
  try {
    await createApiProxy(readProxyConfig(process.env))(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Kết nối dịch vụ chưa được cấu hình.' },
      }),
    );
  }
}
