import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

const publicDir = fileURLToPath(new URL('./public', import.meta.url));
const virtualId = 'virtual:kids-inline-assets';
const mime: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const dataUri = (publicPath: string) =>
  `data:${mime[extname(publicPath)]};base64,${readFileSync(join(publicDir, publicPath)).toString('base64')}`;

/** Đổi âm thanh, hình và font PJ7 trong public/ thành data URI để file HTML chạy được không cần server. */
function inlineKidsAssets(): Plugin {
  return {
    name: 'kids-inline-assets',
    enforce: 'pre',
    resolveId: (id) => (id === virtualId ? `\0${virtualId}` : undefined),
    load(id) {
      if (id !== `\0${virtualId}`) return;
      const entries = ['audio/kids-learning', 'images/kids-learning'].flatMap((dir) =>
        readdirSync(join(publicDir, dir))
          .filter((file) => extname(file) in mime)
          .map((file) => [`/${dir}/${file}`, dataUri(`${dir}/${file}`)]),
      );
      entries.push(['/images/kids-learning.svg', dataUri('images/kids-learning.svg')]);
      return `export default ${JSON.stringify(Object.fromEntries(entries))};`;
    },
    transform(code, id) {
      if (!id.split('?')[0].endsWith('kids-learning/learning.css')) return;
      return code.replace(
        /url\('(\/fonts\/[^']+)'\)/g,
        (_, path: string) => `url('${dataUri(path)}')`,
      );
    },
  };
}

/**
 * Gộp JS/CSS vào chính file HTML để chỉ còn một file.
 * `</script` và `</style` trong mã được escape để không đóng thẻ sớm.
 */
function singleFile(): Plugin {
  return {
    name: 'kids-single-file',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find(
        (file) => file.type === 'asset' && file.fileName.endsWith('.html'),
      );
      if (!html || html.type !== 'asset') return;
      html.source = String(html.source)
        .replace(/<script\b[^>]*\bsrc="\.?\/?([^"]+)"[^>]*><\/script>/g, (tag, name: string) => {
          const chunk = bundle[name];
          if (chunk?.type !== 'chunk') return tag;
          delete bundle[name];
          return `<script type="module">${chunk.code.replaceAll('</script', '<\\/script')}</script>`;
        })
        .replace(
          /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\.?\/?([^"]+)"[^>]*>/g,
          (tag, name: string) => {
            const css = bundle[name];
            if (css?.type !== 'asset') return tag;
            delete bundle[name];
            return `<style>${String(css.source).replaceAll('</style', '<\\/style')}</style>`;
          },
        );
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), tailwind(), inlineKidsAssets(), singleFile()],
  resolve: {
    alias: [
      {
        find: /^\.\/asset-url$/,
        replacement: fileURLToPath(
          new URL('./src/standalone/inline-kids-asset-url.ts', import.meta.url),
        ),
      },
    ],
  },
  build: {
    outDir: 'dist-kids',
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { input: fileURLToPath(new URL('./kids.html', import.meta.url)) },
  },
});
