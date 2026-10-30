import type { Page } from '@playwright/test';

export const tap = (page: Page, label: string) => page.getByRole('button', { name: label, exact: true }).click();
export const check = (page: Page, label: string) => page.getByLabel(label, { exact: true }).check();
export const summary = (page: Page) => page.getByTestId('summary');
export const headline = (page: Page) => page.getByRole('heading', { level: 1 });
// The reasons, the Kaiser line and the note sit in a <details> that starts closed.
export const openWhy = (page: Page) => page.locator('summary', { hasText: 'ดูเหตุผลและข้อความ' }).click();

export async function start(page: Page, ga: string): Promise<void> {
  await page.goto('/');
  await tap(page, 'เริ่ม');
  await tap(page, ga);
}

// Room air, then "no" to every clinical-illness item, in the engine's order.
export async function noClinicalIllness(page: Page): Promise<void> {
  for (const label of ['ไม่ใช้', 'ไม่ได้', 'ไม่มี', 'ไม่ใช่', 'ไม่มี', 'ไม่ใช่', 'ไม่ใช่']) await tap(page, label);
}
