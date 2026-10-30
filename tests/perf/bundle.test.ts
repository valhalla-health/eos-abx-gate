import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

describe.skipIf(process.env.RUN_TEST_SUITE !== 'full')('bundle size', () => {
  it('JS and CSS together are at most 100 KB gzipped (SRS section 6)', () => {
    const dir = join(process.cwd(), 'dist', 'assets');
    const files = readdirSync(dir).filter((f) => /\.(js|css)$/.test(f));
    // An empty build sums to 0 bytes and would pass the size check, so count the files first.
    expect(files.filter((f) => f.endsWith('.js')).length).toBeGreaterThan(0);
    expect(files.filter((f) => f.endsWith('.css')).length).toBeGreaterThan(0);
    const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
    expect(total).toBeLessThanOrEqual(100 * 1024);
  });
});
