import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('Vercel routing preserves API/deep links while missing assets return404; no frontend secret', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'apps/web/dist');
  assert.equal(config.routes[0].dest, '/api/proxy.mjs?__codex_path=$1');
  assert.equal(config.routes[1].handle, 'filesystem');
  assert(config.routes.some((route) => route.status === 404 && route.src.includes('assets')));
  assert.equal(config.routes.at(-1).dest, '/index.html');
  assert.equal(config.env, undefined);
  assert.equal(config.build?.env, undefined);
  const route = (path, exists = false) => {
    for (const entry of config.routes) {
      if (entry.handle === 'filesystem') {
        if (exists) return path;
        continue;
      }
      const regex = new RegExp(entry.src);
      if (!regex.test(path)) continue;
      return entry.status || path.replace(regex, entry.dest);
    }
  };
  assert.equal(
    route('/api/bricks/designs/fixture-id'),
    '/api/proxy.mjs?__codex_path=bricks/designs/fixture-id',
  );
  assert.equal(route('/assets/missing.js'), 404);
  assert.equal(route('/images/missing.svg'), 404);
  assert.equal(route('/projects/brick-playground/view/fixture-id'), '/index.html');
  assert.equal(route('/assets/compiled.js', true), '/assets/compiled.js');
});
