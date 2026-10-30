import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { check, noClinicalIllness, openWhy, start, summary, tap } from './helpers';

// vite preview does not read public/_headers, so the journeys run without the CSP that Cloudflare
// sends in production. This test adds that exact header to every response and walks to a Kaiser
// result and the override form. An inline script or style the build injects, or a style attribute
// set by the code, would be refused here instead of only on the live page.
const csp = /Content-Security-Policy:\s*(.+)/.exec(readFileSync('public/_headers', 'utf8'))?.[1]?.trim() ?? '';

test('10. the page works under the production CSP with no violation', async ({ page }) => {
  expect(csp).toContain("connect-src 'none'");
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
  });
  const refused: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) refused.push(m.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { cspViolations: string[] };
    w.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => w.cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });

  await start(page, '40 wk');
  await noClinicalIllness(page);
  await check(page, 'RR 60 ขึ้นไป');
  await check(page, 'grunting, flaring หรือ retraction โดยไม่ต้องใช้ O₂');
  await tap(page, 'ต่อไป');
  await tap(page, '+0 วัน');
  await page.getByRole('textbox').fill('37.0');
  await tap(page, 'ต่อไป');
  await page.getByRole('textbox').fill('10');
  await tap(page, 'ต่อไป');
  await tap(page, 'ลบ');
  await tap(page, 'ไม่ได้');
  await expect(summary(page)).toContainText('after exam 1.06/1000');
  await tap(page, 'จะให้ ABX ต่างจากนี้');
  await tap(page, 'ยกเลิก');
  await openWhy(page);
  await expect(summary(page)).toBeVisible();

  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
  expect(refused).toEqual([]);
  // The header really is in force: a fetch from the page is refused by connect-src 'none'.
  expect(await page.evaluate(() => fetch('/').then(() => 'sent', () => 'refused'))).toBe('refused');
});
