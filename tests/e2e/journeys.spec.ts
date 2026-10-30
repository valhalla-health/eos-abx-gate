import { expect, test, type Page } from '@playwright/test';
import { check, headline, noClinicalIllness, openWhy, start, summary, tap } from './helpers';

// The signs screen lists only signs continuous for 2 h or more; intermittent time does not count
// (Pp, 2026-10-29; SRS 4.1).
test('1. mild grunting on room air for 1 h is not yet a sign: none ticked, well, 2 h re-check', async ({ page }) => {
  await start(page, '38 wk');
  await noClinicalIllness(page);
  await expect(headline(page)).toHaveText('ตั้งแต่ออกจากห้องคลอด มีข้อไหนเป็นต่อเนื่องนาน 2 ชม. ขึ้นไป');
  await expect(page.getByText('เลือกได้หลายข้อ เป็น ๆ หาย ๆ ไม่นับ')).toBeVisible();
  await tap(page, 'ไม่มีเลย');
  await tap(page, 'ไม่มีไข้');
  await tap(page, 'ไม่มีเลย');
  await expect(headline(page)).toHaveText('ไม่ให้ ABX');
  await expect(page.getByText('ถ้ามีอาการผิดปกติต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่')).toBeVisible();
  await expect(summary(page)).toContainText('Category: Well-appearing (no sign meeting clinical-illness or equivocal criteria)');
  await expect(summary(page)).toContainText('Signs continuous ≥2 h since delivery room: none');
  await expect(summary(page)).toContainText('Action (KCMH CPG): routine care');
  await expect(summary(page)).toContainText('Re-check: run again if any sign lasts 2 h continuously');
});

test('1b. one sign continuous for 3 h, not yet 4 h: well, 4 h re-check', async ({ page }) => {
  await start(page, '38 wk');
  await noClinicalIllness(page);
  await check(page, 'RR 60 ขึ้นไป');
  await tap(page, 'ต่อไป');
  await expect(headline(page)).toHaveText('ข้อนี้เป็นต่อเนื่องนานถึง 4 ชม. หรือยัง');
  await expect(page.locator('.sign')).toHaveText('RR 60 ขึ้นไป');
  await tap(page, 'ยังไม่ถึง');
  await tap(page, 'ไม่มีไข้');
  await tap(page, 'ไม่มีเลย');
  await expect(headline(page)).toHaveText('ไม่ให้ ABX');
  await expect(
    page.getByText('ถ้าอาการนี้ต่อเนื่องครบ 4 ชม. หรือมีอาการอีกข้อต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่'),
  ).toBeVisible();
  await expect(summary(page)).toContainText('Category: Well-appearing (one sign, continuous for less than 4 h)');
  await expect(summary(page)).toContainText('Signs continuous ≥2 h since delivery room: RR ≥60 (not yet 4 h)');
  await expect(summary(page)).toContainText(
    'Re-check: run again if the sign lasts 4 h continuously or a second sign lasts 2 h continuously',
  );
});

test('1c. one sign continuous for 4 h, low-risk mother: equivocal, Kaiser, no antibiotics', async ({ page }) => {
  await start(page, '40 wk');
  await noClinicalIllness(page);
  await check(page, 'HR 160 ขึ้นไป');
  await tap(page, 'ต่อไป');
  await expect(headline(page)).toHaveText('ข้อนี้เป็นต่อเนื่องนานถึง 4 ชม. หรือยัง');
  await expect(page.locator('.sign')).toHaveText('HR 160 ขึ้นไป');
  await tap(page, 'ถึงแล้ว');
  await tap(page, '+0 วัน');
  await page.getByRole('textbox').fill('37.0');
  await tap(page, 'ต่อไป');
  await page.getByRole('textbox').fill('10');
  await tap(page, 'ต่อไป');
  await tap(page, 'ลบ');
  await tap(page, 'ไม่ได้');
  await expect(headline(page)).toHaveText('ยังไม่ให้ ABX');
  await expect(summary(page)).toContainText('Category: Equivocal (one sign continuous for 4 h or more)');
  await expect(summary(page)).toContainText('Signs continuous ≥2 h since delivery room: HR ≥160 (reached 4 h)');
  await expect(summary(page)).toContainText('at birth 0.29/1000, after exam 1.06/1000');
});

test('2. RR 60+ and grunting each continuous for 2 h, low-risk mother: equivocal with no duration tap, Kaiser, no antibiotics', async ({ page }) => {
  await start(page, '40 wk');
  await noClinicalIllness(page);
  await check(page, 'RR 60 ขึ้นไป');
  await check(page, 'grunting, flaring หรือ retraction โดยไม่ต้องใช้ O₂');
  await tap(page, 'ต่อไป');
  // Two signs ticked on the 2 h screen are equivocal at once: the next screen is the first Kaiser one.
  await expect(headline(page)).toHaveText('GA เกินมากี่วัน');
  await tap(page, '+0 วัน');
  await page.getByRole('textbox').fill('37.0');
  await tap(page, 'ต่อไป');
  await page.getByRole('textbox').fill('10');
  await tap(page, 'ต่อไป');
  await tap(page, 'ลบ');
  await tap(page, 'ไม่ได้');
  await expect(summary(page)).toContainText('Category: Equivocal (two or more signs continuous for 2 h or more)');
  await expect(summary(page)).toContainText('at birth 0.29/1000, after exam 1.06/1000');
  // The banner and the pills are the screen; the reasons and the note wait behind a closed <details>.
  await expect(headline(page)).toHaveText('ยังไม่ให้ ABX');
  await expect(page.getByText('CBC + H/C · VS ทุก 4 ชม. นาน 24 ชม.')).toBeVisible();
  await expect(page.getByText('Kaiser 1.06/1000')).toBeVisible();
  await expect(summary(page)).toBeHidden();
  await openWhy(page);
  const why = page.locator('details');
  await expect(why.getByText('Kaiser 2024 · incidence 0.5/1000')).toBeVisible();
  await expect(why.locator('dd')).toHaveText(['0.29/1000', '1.06/1000']);
  await expect(summary(page)).toBeVisible();
  await expect(summary(page)).toContainText('Action (KCMH CPG): CBC + blood culture, VS q4h x 24 h, NO antibiotics');
});

test('3. CPAP needed after the delivery room: antibiotics one tap after GA', async ({ page }) => {
  await start(page, '39 wk');
  await tap(page, 'CPAP, HFNC หรือ ventilator');
  await expect(headline(page)).toHaveText('ให้ ABX');
  await expect(summary(page)).toContainText('Category: Clinical illness (CPAP/HFNC/ventilator needed outside the delivery room)');
  await expect(summary(page)).toContainText('empiric antibiotics');
});

test('3b. O₂ needed for SpO₂ >90% for 2 h or more since the delivery room: clinical illness', async ({ page }) => {
  await start(page, '38 wk');
  await tap(page, 'O₂');
  await tap(page, 'ใช่ ถ้าไม่ให้ SpO₂ จะต่ำกว่า 90%');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ใช้ O₂ มานานรวมเท่าไร นับตั้งแต่ออกจากห้องคลอด');
  await tap(page, '2 ชม. ขึ้นไป');
  await expect(summary(page)).toContainText('Category: Clinical illness (O2 needed for SpO2 >90% for 2 h or more)');
  await expect(summary(page)).toContainText('empiric antibiotics');
});

test('4. well baby, documented fever, suspected Triple I: serial assessment', async ({ page }) => {
  await start(page, '39 wk');
  await noClinicalIllness(page);
  await tap(page, 'ไม่มีเลย');
  await tap(page, '39.0 °C ขึ้นไป');
  await check(page, 'WBC แม่เกิน 15,000 โดยไม่ได้ steroid');
  await tap(page, 'ต่อไป');
  await tap(page, 'ไม่มี หรือยังไม่ได้ตรวจ');
  await expect(summary(page)).toContainText('CPG path: maternal fever, suspected Triple I');
  await expect(summary(page)).toContainText('serial assessment with VS for 48-72 h, NO lab, NO antibiotics');
});

test('5. well baby, confirmed Triple I: antibiotics', async ({ page }) => {
  await start(page, '39 wk');
  await noClinicalIllness(page);
  await tap(page, 'ไม่มีเลย');
  await tap(page, '39.0 °C ขึ้นไป');
  await check(page, 'WBC แม่เกิน 15,000 โดยไม่ได้ steroid');
  await tap(page, 'ต่อไป');
  await check(page, 'placental pathology บอกว่าติดเชื้อ');
  await tap(page, 'ต่อไป');
  await expect(summary(page)).toContainText('CPG path: maternal fever, confirmed Triple I');
  await expect(summary(page)).toContainText('empiric antibiotics');
  // No sign was ticked, but the baby already gets ABX, so there is no re-check line (Pp, 2026-10-30).
  await expect(page.locator('.recheck')).toHaveCount(0);
  await expect(summary(page)).not.toContainText('Re-check');
});

test('6. override reason and staff name reach the summary', async ({ page }) => {
  await start(page, '38 wk');
  await noClinicalIllness(page);
  await tap(page, 'ไม่มีเลย');
  await tap(page, 'ไม่มีไข้');
  await tap(page, 'ไม่มีเลย');
  await tap(page, 'จะให้ ABX ต่างจากนี้');
  // Neither text box may offer the browser's saved entries on a shared ward PC.
  await expect(page.getByLabel('เหตุผลสั้น ๆ ไม่ต้องใส่ชื่อหรือ HN')).toHaveAttribute('autocomplete', 'off');
  await expect(page.getByLabel('ชื่อ staff ที่เห็นด้วย')).toHaveAttribute('autocomplete', 'off');
  await check(page, 'staff สั่ง');
  await page.getByLabel('ชื่อ staff ที่เห็นด้วย').fill('อ.ทดสอบ');
  await tap(page, 'บันทึก');
  await expect(summary(page)).toContainText('Override: staff decision | agreed by อ.ทดสอบ');
});

test('7. GA below 35 is out of scope', async ({ page }) => {
  await start(page, 'ต่ำกว่า 35 wk');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ใช้หน้านี้ไม่ได้');
  // No recommendation was given, so there is nothing to override (N9).
  await expect(page.getByRole('button', { name: 'จะให้ ABX ต่างจากนี้', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ย้อนกลับ', exact: true })).toBeVisible();
});

test('8. no network request after the page loads', async ({ page }) => {
  const late: string[] = [];
  await page.goto('/');
  // The start screen states the age window (no age question; SRS section 1).
  await expect(page.getByText('อายุไม่เกิน 72 ชม.', { exact: false })).toBeVisible();
  await page.waitForLoadState('networkidle');
  page.on('request', (r) => late.push(r.url()));
  await tap(page, 'เริ่ม');
  await tap(page, '40 wk');
  await noClinicalIllness(page);
  await tap(page, 'ไม่มีเลย');
  await tap(page, 'ไม่มีไข้');
  await tap(page, 'ไม่มีเลย');
  await openWhy(page);
  await expect(summary(page)).toBeVisible();
  expect(late).toEqual([]);
});

test('11. a checked sign or a typed number blocks the "none" button on that screen', async ({ page }) => {
  await start(page, '40 wk');
  await noClinicalIllness(page);
  const none = page.getByRole('button', { name: 'ไม่มีเลย', exact: true });
  await check(page, 'RR 60 ขึ้นไป');
  await expect(none).toBeDisabled();
  await page.getByLabel('RR 60 ขึ้นไป', { exact: true }).uncheck();
  await expect(none).toBeEnabled();
  await check(page, 'RR 60 ขึ้นไป');
  await tap(page, 'ต่อไป');
  await tap(page, 'ถึงแล้ว');
  await tap(page, '+0 วัน');
  const noValue = page.getByRole('button', { name: 'ไม่มีค่าที่วัดไว้', exact: true });
  await page.getByRole('textbox').fill('37.0');
  await expect(noValue).toBeDisabled();
  await page.getByRole('textbox').fill('');
  await expect(noValue).toBeEnabled();
  // An entry that does not parse is still a number being typed, and the field shows it as typed.
  await page.getByRole('textbox').fill('37..');
  await expect(page.getByRole('textbox')).toHaveValue('37..');
  await expect(noValue).toBeDisabled();
  await tap(page, 'ต่อไป');
  await expect(page.getByRole('alert')).toHaveText('ใส่ตัวเลขระหว่าง 34 ถึง 42');
});

test('11b. a number written as hex or in exponent form shows the range error, and the ROM screen says what to press above 240 h', async ({ page }) => {
  await start(page, '40 wk');
  await noClinicalIllness(page);
  await check(page, 'RR 60 ขึ้นไป');
  await tap(page, 'ต่อไป');
  await tap(page, 'ถึงแล้ว');
  await tap(page, '+0 วัน');
  const box = page.getByRole('textbox');
  // 0x26 is 38 and 3.8e1 is 38 to Number(), but neither is a number the resident typed on purpose.
  for (const typed of ['0x26', '3.8e1']) {
    await box.fill(typed);
    await tap(page, 'ต่อไป');
    await expect(page.getByRole('alert')).toHaveText('ใส่ตัวเลขระหว่าง 34 ถึง 42');
  }
  await box.fill('37.0');
  await tap(page, 'ต่อไป');
  await expect(page.getByText('ถ้านานกว่า 240 ชม. กดไม่ทราบ')).toBeVisible();
  await box.fill('1e2');
  await tap(page, 'ต่อไป');
  await expect(page.getByRole('alert')).toHaveText('ใส่ตัวเลขระหว่าง 0 ถึง 240');
  await box.fill('10');
  await tap(page, 'ต่อไป');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ผล GBS ของแม่');
});

test('12. Back from a result returns to the last question with the earlier answers kept', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 });
  await start(page, '38 wk');
  await noClinicalIllness(page);
  await tap(page, 'ไม่มีเลย');
  await tap(page, 'ไม่มีไข้');
  await tap(page, 'ไม่มีเลย');
  await expect(summary(page)).toContainText('Action (KCMH CPG): routine care');
  await tap(page, 'ย้อนกลับ');
  await expect(h1).toHaveText('แม่มีข้อบ่งชี้ GBS IAP ข้อไหนบ้าง');
  await check(page, 'GBS culture บวกในครรภ์นี้');
  await tap(page, 'ต่อไป');
  await tap(page, 'ไม่ได้');
  await expect(summary(page)).toContainText('GA 38 wk | Category: Well-appearing');
  await expect(summary(page)).toContainText('CPG path: no fever, GBS IAP indication, IAP not adequate');
  await expect(summary(page)).toContainText('serial assessment with VS for 48-72 h');
});

test('13. poor feeding not yet seen by staff stops at the call-staff screen', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 });
  await start(page, '40 wk');
  for (const label of ['ไม่ใช้', 'ไม่ได้', 'ไม่มี', 'ไม่ใช่', 'ไม่มี', 'ใช่']) await tap(page, label);
  await expect(h1).toHaveText('staff มาดูเองแล้วหรือยัง');
  await tap(page, 'ยัง');
  await expect(h1).toHaveText('ให้ staff มาดูเด็กก่อน ข้อนี้นับได้เมื่อ staff ดูเองแล้วเห็นด้วย');
  await expect(summary(page)).toHaveCount(0);
  await tap(page, 'ย้อนกลับ');
  await expect(h1).toHaveText('staff มาดูเองแล้วหรือยัง');
  await tap(page, 'staff ดูแล้ว เห็นด้วย');
  await expect(summary(page)).toContainText('Category: Clinical illness (poor feeding, checked by staff)');
});

test('14. no maternal Tmax recorded: Kaiser is not computed and the page says discuss with staff', async ({ page }) => {
  await start(page, '40 wk');
  await noClinicalIllness(page);
  await check(page, 'RR 60 ขึ้นไป');
  await tap(page, 'ต่อไป');
  await tap(page, 'ถึงแล้ว');
  await tap(page, '+0 วัน');
  await tap(page, 'ไม่มีค่าที่วัดไว้');
  await expect(headline(page)).toHaveText('ปรึกษา staff');
  await expect(summary(page)).toContainText('Category: Equivocal (one sign continuous for 4 h or more)');
  await expect(summary(page)).toContainText('Action (KCMH CPG): Kaiser not computed (maternal Tmax or ROM missing); discuss with staff');
  await expect(summary(page)).not.toContainText('Kaiser 2024');
});

test('15. the note is stamped with the time Copy is tapped', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 29, 14, 32));
  await start(page, 'ต่ำกว่า 35 wk');
  await expect(summary(page)).toContainText('| 2026-10-29 14:32');
  await page.clock.setFixedTime(new Date(2026, 9, 29, 14, 47));
  await tap(page, 'คัดลอกข้อความสรุป');
  await expect(summary(page)).toContainText('| 2026-10-29 14:47');
  await expect(page.getByRole('status')).not.toBeEmpty();
});

// A human double tap is two taps on the same point, tens of milliseconds apart. The
// second one hits whatever the first answer put there, so this also returns whether a
// button sits under that point on the screen that follows: a test that expects the
// second tap to be ignored proves nothing when the point is blank, so test 9 checks it.
// Playwright's own dblclick() is not used: it sends both taps within about a millisecond,
// faster than a timer of 0 ms, so it passes even with the guard switched off.
// dy moves the tap point down from the button's centre, to a spot that is inside this button and
// inside a button of the next screen.
async function doubleTap(page: Page, label: string, dy = 0): Promise<boolean> {
  const button = page.getByRole('button', { name: label, exact: true });
  const box = await button.boundingBox();
  if (!box) throw new Error(`no button "${label}" to tap`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2 + dy;
  // The first tap waits for the button to be enabled (the screen arms for 300 ms); the second does not.
  await button.click({ position: { x: box.width / 2, y: box.height / 2 + dy } });
  await page.waitForTimeout(50);
  await page.mouse.click(x, y);
  return page.evaluate(([px, py]) => Boolean(document.elementFromPoint(px!, py!)?.closest('button')), [x, y]);
}

test('9. a double tap answers only one question', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 });
  await page.goto('/');
  await tap(page, 'เริ่ม');
  // The lower part of "36 wk" sits where "CPAP, HFNC หรือ ventilator" sits on the next screen, whose
  // title takes two lines at 390 px (36 wk spans y 202-255, CPAP 231-284; the tap lands at y 243).
  const onResp = await doubleTap(page, '36 wk', 14);
  await expect(h1).toHaveText('ตั้งแต่ออกจากห้องคลอด ต้องใช้อะไรช่วยหายใจมากที่สุด');
  expect(onResp).toBe(true);
  await tap(page, 'ไม่ใช้');
  await tap(page, 'ไม่ได้');
  // "ไม่มี" (seizure) sits where "ไม่ใช่" sits on the Apgar screen.
  const onApgar = await doubleTap(page, 'ไม่มี');
  await expect(h1).toHaveText('Apgar 5 นาทีต่ำกว่า 5 ไหม');
  expect(onApgar).toBe(true);
});
