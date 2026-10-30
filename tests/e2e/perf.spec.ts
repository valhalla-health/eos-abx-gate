import { expect, test } from '@playwright/test';

test.skip(process.env.RUN_TEST_SUITE !== 'full', 'runs only with RUN_TEST_SUITE=full');

// Profile (SRS section 6): 400 ms added latency, 400 kbit/s down and up (the code sets 400 × 1024 / 8 bytes/s). Source: Chrome DevTools'
// "3G" preset (named "Slow 3G" until 2024) in devtools-frontend front_end/core/sdk/NetworkManager.ts,
// download and upload 500 kbit/s x 0.8, target RTT 400 ms. DevTools itself adds 400 x 5 = 2000 ms of
// latency for that RTT; this test uses the 400 ms target, so it is lighter than the DevTools preset.
test('first screen is interactive within 2 s at 400 ms latency and 400 kbit/s', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  const t0 = Date.now();
  await page.goto('/');
  await page.getByRole('button', { name: 'เริ่ม', exact: true }).waitFor();
  expect(Date.now() - t0).toBeLessThanOrEqual(2000);
});
