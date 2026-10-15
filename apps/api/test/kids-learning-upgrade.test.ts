import { test, expect } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { mkdtemp, copyFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { migrate } from '../src/services/migrations.js';
import { seed } from '../src/services/seed.js';

test('L18 six-project upgrade, repeated migrate/seed, URL constraint and failed transaction preserve data', async () => {
  const base = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `kids_upgrade_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const pool = new Pool({ connectionString: url.href });
  const dir = await mkdtemp(`${tmpdir()}/kids-upgrade-`);
  try {
    await base.query(`CREATE SCHEMA "${schema}"`);
    for (const file of (await readdir(new URL('../db/migrations', import.meta.url))).filter((n) =>
      /^00[1-5]_/.test(n),
    ))
      await copyFile(new URL(`../db/migrations/${file}`, import.meta.url), `${dir}/${file}`);
    await migrate(pool, dir);
    for (const slug of ['autohub', 'memory-match', 'admin'])
      await pool.query('INSERT INTO portfolio_projects VALUES($1,$1,$1,$1,$2,$3,$4)', [
        slug,
        ['React'],
        `/projects/${slug}`,
        '/images/car-1.svg',
      ]);
    await pool.query("UPDATE portfolio_projects SET title='Tên riêng của tôi: '||slug");
    const before = (await pool.query('SELECT * FROM portfolio_projects ORDER BY slug')).rows;
    expect(before).toHaveLength(6);
    await migrate(pool);
    await migrate(pool);
    await seed(pool);
    await seed(pool);
    const after = (await pool.query('SELECT * FROM portfolio_projects ORDER BY slug')).rows;
    expect(after).toHaveLength(7);
    for (const row of before) expect(after.find((r) => r.slug === row.slug)).toEqual(row);
    const kids = after.find((r) => r.slug === 'kids-learning');
    expect(kids.url).toBe('/projects/kids-learning');
    await expect(
      pool.query("UPDATE portfolio_projects SET url='/projects/evil' WHERE slug='kids-learning'"),
    ).rejects.toThrow();
    await pool.query("UPDATE portfolio_projects SET title='Bài của bé' WHERE slug='kids-learning'");
    await seed(pool);
    expect(
      (await pool.query("SELECT title FROM portfolio_projects WHERE slug='kids-learning'")).rows[0]
        .title,
    ).toBe('Bài của bé');
    await copyFile(
      new URL('../db/migrations/006_kids_learning.sql', import.meta.url),
      `${dir}/006_kids_learning.sql`,
    );
    await writeFile(
      `${dir}/007_failure.sql`,
      "UPDATE portfolio_projects SET title='should rollback'; SELECT * FROM nonexistent_table;",
    );
    await expect(migrate(pool, dir)).rejects.toThrow();
    expect(
      (await pool.query("SELECT title FROM portfolio_projects WHERE slug='kids-learning'")).rows[0]
        .title,
    ).toBe('Bài của bé');
    expect(
      (
        await pool.query(
          "SELECT count(*) FROM schema_migrations WHERE name='006_kids_learning.sql'",
        )
      ).rows[0].count,
    ).toBe('1');
  } finally {
    await pool.end();
    await base.query(`DROP SCHEMA "${schema}" CASCADE`);
    await base.end();
    await rm(dir, { recursive: true, force: true });
  }
});
