# EOS ABX Gate

Tap-through page used before starting antibiotics in a baby ≥35 weeks with suspected early-onset
sepsis at KCMH. It follows the KCMH EOS CPG and runs the Kaiser Permanente 2024 EOS model for
equivocal babies. It stores nothing and sends nothing.

- Spec: `docs/SRS.md`
- Live: https://eos-abx-gate.valhalla-health.workers.dev (after deploy)
- Definitions: draft 2026-10-29, not yet agreed by the NICU team

## Run

    npm install
    npm run dev          # http://localhost:5173
    npm test             # Vitest: unit tests, plus tests/perf (bundle size skipped unless RUN_TEST_SUITE=full)
    npm run test:e2e     # Playwright journeys (needs `npx playwright install chromium` once)
    npm run test:full    # build, then Vitest and Playwright with RUN_TEST_SUITE=full (bundle size and load time run)

## Layout

`src/data` types, constants and copy · `src/logic` clinical rules (pure functions) ·
`src/flow` question order and session · `src/ui` screens.

## Changing the incidence

Edit `INCIDENCE_PER_1000` in `src/data/config.ts`. Use a value from `SITE_INTERCEPTS` in
`src/data/kaiser2024.ts` so the page matches the official site.

## Attribution

Kaiser Permanente Neonatal Early-Onset Sepsis Calculator, 2024 model
(https://neonatalsepsiscalculator.kaiserpermanente.org/); Kuzniewicz et al., Pediatrics 2024;154(4).
