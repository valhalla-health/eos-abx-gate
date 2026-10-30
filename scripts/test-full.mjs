import { spawnSync } from 'node:child_process';

const env = { ...process.env, RUN_TEST_SUITE: 'full' };
for (const cmd of ['npm run build', 'npx vitest run', 'npx playwright test']) {
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
