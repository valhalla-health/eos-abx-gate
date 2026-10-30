# EOS ABX Gate: code review report

2026-10-29 · Reviewed: every file in `src/`, plus `index.html`, `public/_headers`, the build and test
configs and the tests, at commit `758af7c` · Fixes run from `f91ae4d` to `e6c7d28` · Final
whole-branch review of `f258110..42fe139`, fixes `788bafe` to `5b51d95` · Spec: [`SRS.md`](SRS.md)

The public repository starts from one commit (2026-10-30). The commit hashes up to row P2 belong to
the 49-commit history before that release, which is kept privately; later hashes are public.

**56 rows: 41 fixed, 10 open, 5 won't fix.** The final review found one Critical row, F-C1 (the
respiratory and sign screens asked only about now), and it is fixed. Every fixed row passed
`npm run test:full` (build, Vitest, bundle size, Playwright) before its commit. The 10 open rows wait
for Pp; each carries one question in Thai. N10 closed with the result-screen redesign (`58ce94e`).
P1 is Pp's continuous-time rule for the equivocal signs (Task 15, `07d48c5`), and its new text closed
B3. P2 is her three answers of 2026-10-30 on the 4 h screen and the re-check lines (Task 16,
`3c27c3e`). P3 is her rule of the same day that a sign counts only while present at assessment; O₂ and
CPAP keep F-C1's since-delivery-room window. Pp confirmed B4 (unknown GA days) the same day.
One open row is Important: B5 (drafted thresholds, a release gate). F-I2 (the page's °C to °F
conversion differed from the Kaiser site) is fixed.

Severity:

- **Critical**: could give a wrong action for a baby, or let patient data leave the page.
- **Important**: can mislead the resident, break the page only in production, or hide a defect from
  the tests.
- **Minor**: wording, code quality, small UX, or dev-time only.

Row IDs: A = fix pre-approved by the controller, B = open for Pp by the controller's list, C = won't
fix by the controller's list, N = found in this review, F = found in the final whole-branch review,
P = a clinical decision of Pp's made after the review.
An F row keeps that review's own label after the F, so F-C1 is its Critical 1, not row C1; F-O rows
are items the controller left open for Pp. Locations are at `758af7c` for A rows, at `e6c7d28` for
B, C and N rows, and at `42fe139` for F rows. The final review's C2 is row N3, its I5 is B1 and its
I6 is N10.

## Issues

| ID | Category | Severity | Location | Problem | Suggested fix | Status |
|---|---|---|---|---|---|---|
| A1 | Bug | Minor | repo root (no `.gitattributes`); `public/_headers:1` | With `core.autocrlf=true` a Windows checkout turns LF into CRLF (`tests/e2e/journeys.spec.ts` already was). `public/_headers` is copied byte for byte into `dist/` and must stay LF. | Add `.gitattributes` with `* text=auto eol=lf`; renormalise once. [Fix A1](#a1) | fixed `f91ae4d` |
| A2 | Performance | Minor | `index.html:6` | No icon link, so every browser asks for `/favicon.ico` and gets a 404. | `<link rel="icon" href="data:," />`; the CSP already allows `img-src data:`. [Fix A2](#a2) | fixed `e3a21b5` |
| A3 | Bug | Minor | `tests/perf/bundle.test.ts:9` | With an empty `dist/assets` the total is 0 bytes and the 100 KB check passes. | Assert at least one `.js` and one `.css` file before summing. [Fix A3](#a3) | fixed `8334f1d` |
| A4 | Bug | Important | `src/data/text.ts:95`; `src/logic/summary.ts:6`; `src/logic/kaiser.ts:64` | The screen printed the Kaiser numbers with `toFixed(2)`; the note and `band()` used `Math.round(x*100)/100`. At a posterior of 0.995/1000 the screen showed **0.99** (the observe band) while the note showed 1.00 and the action was CBC + culture. | One formatter, `formatPer1000`, in `src/logic/kaiser.ts`, used by the screen, the note and `band()`. `band()` keeps its rounding, so no action changes. Tests at 0.995 and 2.995. [Fix A4](#a4) | fixed `ee7a97e` |
| A5 | Bug | Minor | `src/flow/session.ts:9` | `answer()` took any value for any key, and a key answered twice went into the history twice, so the second back tap changed nothing on screen. | `answer<K extends AnswerKey>(key: K, value: Answers[K])`; push a key only once. [Fix A5](#a5) | fixed `01fd564` |
| A6 | Security | Important | `src/ui/render.ts:200`; `src/data/text.ts:125` | On a shared ward PC the override text boxes offered the last resident's entries (browser form history). The reason box did not say "no name or HN". | `autocomplete="off"` on both boxes; reason placeholder `เหตุผลสั้น ๆ ไม่ต้องใส่ชื่อหรือ HN`. The staff-name label E2E fills is unchanged. [Fix A6](#a6) | fixed `b899b45` |
| A7 | Code Smell | Minor | `src/ui/render.ts:30` | Every answer button got `class="choice"`, and `styles.css` has no `.choice` rule. | Stop setting the class; the bare `button` rule already styles them. [Fix A7](#a7) | fixed `b5f9786` |
| A8 | Code Smell | Minor | `tests/unit/` | Five paths had no test: GBS-specific antibiotics asking timing; fever not repeated and repeat lower; a stale `confirmed` with empty `suspected`; the `<35 wk` note line and an "other" override; missing GBS or maternal antibiotics. | Six tests. [Fix A8](#a8) | fixed `35bd7f0` |
| A9 | Security | Minor | `package.json:15` | `npm audit`: 14 advisories (2 moderate, 10 high, 2 critical) in the dev toolchain. | Latest of each major, still pinned exactly: vite 5.4.21, vitest 2.1.9, wrangler 4.155.0, Playwright 1.64.1. Audit after: 6 (see N12). [Fix A9](#a9) | fixed `8f0cd93` |
| N1 | Security | Important | `playwright.config.ts:7`; `public/_headers:2` | `vite preview` ignores `public/_headers`, so no test ever ran the page under its CSP. An inline script or style from the build, or a `style` attribute in the code, would break the live page only. | E2E test 10 adds the exact CSP header from `public/_headers` to every response, walks to a Kaiser result and the override form, and fails on any CSP violation. [Fix N1](#n1) | fixed `d22faef` |
| N2 | Bug | Important | `src/ui/render.ts:121` and `:143` | On a multi-select screen, ไม่มีเลย saved "none" even with boxes ticked: tick RR ≥60, then one wrong tap, and an equivocal baby went down the well branch. On a number screen, the no-value button threw away a typed number. | While a box is ticked, ไม่มีเลย is disabled; while a number is typed, the no-value button is disabled. No label, rule or threshold changes. E2E test 11. [Fix N2](#n2) | fixed `e6c7d28` |
| B1 | Bug | Minor | `src/data/questions.ts:114` | ROM hours stopped at 336 (14 days), set without checking the Kaiser site. On the site (2024 model, 2026-10-29, c01's other inputs) ROM 240 h calculates (0.98 at birth, 3.59 equivocal); 240.5, 241, 500, 1000 and 2000 h are refused by its RangeValidator3, "Invalid ROM. Please enter a value between 0 to 240.", and its input's `max` is 240. So between 240 and 336 h the page gave a risk the site will not. | `max: 240`, the site's range, with a unit test and SRS step 6.3. Lower than the draft fix (720 h). [Fix B1](#b1) | fixed `6296c67`. แจ้ง Pp: เว็บ Kaiser รับ ROM ได้ไม่เกิน 240 ชม. หน้านี้เลยลดเพดานจาก 336 เหลือ 240 ชม. ถ้า ROM นานกว่านั้นต้องกดไม่ทราบ แล้ว Kaiser จะไม่คำนวณ |
| B2 | Readability | Minor | `src/data/text.ts:84` | Thai `cultureNoAbx` says ยังไม่ต้องให้ ABX ("not yet"); the English note says "NO antibiotics". | Keep, or change to ไม่ต้องให้ ABX. [Fix B2](#b2) | open: action นี้ภาษาไทยเขียนว่า ยังไม่ต้องให้ ABX แต่ภาษาอังกฤษเขียน NO antibiotics จะคงไว้หรือเปลี่ยนเป็น ไม่ต้องให้ ABX ดี |
| B3 | Readability | Minor | `src/data/text.ts:78` | Thai `signsTooShort` always ends with a sentence about distress without O₂, even when the sign was HR or temperature. | Trim to the first sentence. [Fix B3](#b3) | fixed `07d48c5` with P1: the new text is `มีอาการ 1 ข้อ แต่ต่อเนื่องยังไม่ถึง 4 ชม.` แจ้ง Pp: ข้อความเหตุผล signsTooShort ชุดใหม่จาก Task 15 ไม่มีประโยคเรื่องเหนื่อยแล้ว ข้อนี้เลยปิดไปด้วย |
| B4 | Bug | Important | `src/logic/recommend.ts:24` | Unknown GA days take the higher of the +0 and +6 day risk (controller ruling 2026-10-29, toward more care). The SRS 4.4 row says the same, but it is a clinical rule Pp has not confirmed. | None if confirmed. Alternative: the +3 day point. [Fix B4](#b4) | fixed: Pp confirmed the higher of the +0 and +6 day risk, 2026-10-30; no code change |
| B5 | Bug | Important | `src/data/questions.ts:40`, `:47`, `:53` | The drafted thresholds (bolus for hypotension or CRT >3 s; apnea ≥20 s or shorter with HR <100 or desaturation; poor feeding = 2 missed feeds needing OG or IV) are on screen without Pp's sign-off or the NICU team's agreement. Release gate, SRS section 7. | No code change unless a threshold changes; then edit those three entries. | open: เกณฑ์ฉบับร่างใน SRS 4.1 เรื่อง bolus apnea และ poor feeding Pp sign off แล้วเอาเข้าที่ประชุมทีม NICU ได้เลยไหม |
| B6 | Bug | Minor | `src/ui/render.ts:253` | One tap on เริ่มใหม่ clears the whole walk, with no confirmation. | Ask before clearing. [Fix B6](#b6) | open: กดเริ่มใหม่ครั้งเดียวคำตอบหายหมด ให้หน้าเว็บถามซ้ำก่อนล้างไหม |
| N3 | Bug | Important | `src/data/questions.ts:130` | The broad-spectrum hint says "ampicillin or penicillin with gentamicin or another drug, or cephalosporin 2nd to 4th generation, or carbapenem". SRS 4.2 (Kaiser 2024 FAQ) names the partner drugs: aminoglycoside, aztreonam, azithromycin, metronidazole. Ampicillin with erythromycin (a PPROM latency regimen) is GBS-specific, yet the hint invites "broad", which earns the larger credit (−2.34 against −2.13) and a lower risk. The list also leaves out extended-spectrum penicillins, fluoroquinolones, tetracyclines and TMP-SMX, and the "broadest completed course" rule is not on screen. | Rewrite the hint from SRS 4.2. [Fix N3](#n3) | fixed `2731aad` (final review C2) |
| N4 | Bug | Minor | `src/logic/cpgWell.ts:9`; `src/logic/classify.ts:53` | `recommend()` on incomplete answers fails closed in the Kaiser branch but open in the well branch: no fever answer reads as "no fever, no IAP indication", which is routine care, and no sign answer reads as "no signs". The engine never shows a result before every question is answered, so the page is safe today; a future caller is not. | Return an explicit "incomplete" action when a well-branch answer is missing. [Fix N4](#n4) | fixed `5b51d95`: action `incomplete` ("answers incomplete, discuss with staff") for a missing sign, duration or CPG answer |
| N5 | Readability | Minor | `src/logic/summary.ts:30` | With GA days unknown the note prints `GA 40+? wk` and a Kaiser number, but not that the number is the higher of +0 and +6 days. | Add the rule to the Kaiser line. [Fix N5](#n5) | fixed `5bd0529`, in the Kaiser inputs line (F-I1) |
| N6 | Code Smell | Minor | `src/data/text.ts:180`; `src/data/config.ts:7` | The draft status sits in two places: the Thai footer (`นิยามฉบับร่าง`, with no date since the result-screen redesign) and `DEFINITIONS_STATUS` in the note (`draft 2026-10-29, not yet agreed by NICU team`). The release gate needs the agreed date in the footer, so both must change together. | One status constant in `config.ts` feeding both. [Fix N6](#n6) | open: ตอนทีม NICU รับรองนิยาม ต้องแก้สองที่ คือ footer กับข้อความใน note ย้ายไปไว้ใน config ที่เดียวเลยไหม |
| N7 | Code Smell | Minor | `src/data/questions.ts:3` | Option values are typed `string \| number \| boolean \| null`, not the type of their own key, so a misspelt value (`'repeatStilHigh'`) would compile and silently change the path. Every value is correct today (checked by hand). | Type `QUESTIONS` per key. [Fix N7](#n7) | open: ค่าคำตอบใน questions.ts ยังไม่ผูกกับ type ของแต่ละข้อ แก้ให้ tsc จับค่าที่พิมพ์ผิดได้ใน release ถัดไปไหม |
| N8 | Code Smell | Minor | `src/flow/engine.ts:55` | Which maternal antibiotics need a timing question (GBS-specific or broad) is an antibiotic-class rule written in `flow/`; `logic/kaiser.ts` holds the same knowledge in `abxIndicators`. | Move it to `logic/kaiser.ts` as `needsAbxTiming`. [Fix N8](#n8) | open: กฎว่ายาไหนต้องถามเวลาให้ยาอยู่ใน flow ย้ายไปไว้ใน logic ใน release ถัดไปไหม |
| N9 | Readability | Minor | `src/ui/render.ts:162` | The GA <35 wk screen still offers จะให้ ABX ต่างจากนี้, though the page gave no recommendation to differ from (SRS step 2: the walk ends). | Hide the override button when the action is `outOfScope`. [Fix N9](#n9) | fixed `5b51d95`; E2E 7 checks the button is gone |
| N10 | Readability | Minor | `src/ui/render.ts:162`; `src/data/text.ts` (`RESULT_TH`) | A well baby sent to antibiotics for confirmed Triple I sees "Well-appearing, ไม่มีอาการที่เข้าเกณฑ์ ..." and then "ให้ empiric ABX". The reason, the CPG path, is only in the English note. | Add a Thai CPG-path line to the result screen. [Fix N10](#n10) | fixed `58ce94e`: the result-screen redesign shows `RESULT_TH.wellPath` (in `8e13bcd` with a test) under ดูเหตุผลและข้อความ, after the reason (final review I6) |
| N11 | Performance | Minor | `vite.config.ts:4` | The bundle carries Vite's modulepreload polyfill: a MutationObserver on the whole document that fires on every screen, for a build with one chunk. Its `fetch()` would also be refused by `connect-src 'none'`. | `build.modulePreload: { polyfill: false }`. [Fix N11](#n11) | fixed `5b51d95`; the built bundle no longer holds the polyfill |
| N12 | Security | Minor | `package.json` (`vite`, `vitest`) | Six advisories remain after A9 (esbuild dev server, tinypool, @vitest/mocker, vite-node). All are in vite 5 and vitest 2, all dev-time only, none in `dist/`. The fix is vite 8 and vitest 5, a new major. | A separate task: move to vite 8 and vitest 5, then rerun every tier. | open: advisory ที่เหลือ 6 ข้ออยู่ใน vite 5 กับ vitest 2 ใช้แค่ตอนพัฒนา อัปเกรดเป็น vite 8 กับ vitest 5 เป็นงานแยกไหม |
| N13 | Code Smell | Minor | `src/flow/session.ts:6` | `answers` is a public, writable field: any code can replace the answers without touching the history, and back then removes the wrong key. | Keep it private; expose a read-only getter. [Fix N13](#n13) | open: answers ใน Session ยังแก้จากข้างนอกได้ ปิดให้อ่านได้อย่างเดียวใน release ถัดไปไหม |
| N14 | Readability | Minor | `src/data/types.ts:18` | "Below 35 weeks" is stored as `gaWeeks: 34`, a sentinel number. A future 34-week button would mean the same thing by accident. | A separate `'below35'` value, or a `gaBelow35` flag. [Fix N14](#n14) | open: GA ต่ำกว่า 35 เก็บเป็นเลข 34 อยู่ เปลี่ยนเป็นค่าที่บอกตรง ๆ ว่าต่ำกว่า 35 ไหม |
| F-C1 | Bug | Critical | `src/data/questions.ts:26`, `:33`, `:67`; `src/flow/engine.ts:23`; `src/logic/classify.ts:18` | The respiratory question asked what the baby uses now (ตอนนี้), and the signs screen asked about now too, so a baby weaned off support, or whose grunting had settled, read as needing nothing. CPAP led to "still needed at SCN or NICU?", and "delivery room only" skipped the O₂ questions: a baby on CPAP in the delivery room and O₂ on the unit for 3 h was never asked about the O₂. Both fail toward less care. SRS 4.1 counts illness at any time in the admission and signs as cumulative and intermittent, and Pp's rule is that CPAP counts when needed at SCN or NICU. | Ask about the time since leaving the delivery room; CPAP, HFNC or ventilator then counts at once; remove `cpapAtUnit`. [Fix F-C1](#f-c1) | fixed `788bafe`; for the signs only, P3 (Pp, 2026-10-30) narrows the window to signs present at assessment |
| F-I1 | Readability | Important | `src/logic/summary.ts:24` | The note gave the category and the Kaiser numbers but not what produced them, so a wrong tap could not be seen in the chart. | Note lines for the signs ticked and for the Kaiser inputs, with the unknown-GA-days rule. [Fix F-I1](#f-i1) | fixed `5bd0529` in the note; since `58ce94e` the note, with both lines, is on the result screen under ดูเหตุผลและข้อความ |
| F-I2 | Bug | Important | `src/logic/kaiser.ts:27` | No fixture case was entered on the site in °C. Four were, on 2026-10-29 (c21 to c24, other inputs from c01, c05, c10, c13), and none matches through `cToF`: the site converts without rounding (38.2 °C → 100.76 °F), `cToF` rounds to 0.1 °F (100.8). At birth, page against site: c21 1.89/1.83, c22 6.13/6.35, c23 9.71/9.54, c24 0.18/0.19; c23 equivocal 34.54/33.98. The error is up to ±0.05 °F, about ±4% of the risk in either direction, so a posterior near 1.00 or 3.00 can fall in a different band from the site's. With the unrounded conversion all four match within 0.005. | `cToF` rounds to 2 decimals instead of 0.1, which equals the site's unrounded value for every one-decimal entry. The `it.fails` test is now `it` and passes for c21 to c24; the note prints °F to 2 decimals; SRS 4.2 and 8 and the TDD match. [Fix F-I2](#f-i2) | fixed `902b457` |
| F-I3 | Bug | Important | `src/data/text.ts:102` | Nothing said the page is for the early-onset window, so it could be run on a 5-day-old. | The start text names the 72 h limit; SRS section 1 (users, non-goals) and step 1. E2E 8 checks the text. | fixed `be98735` |
| F-I3b | Bug | Minor | `src/flow/engine.ts:18` | The page states the 72 h limit but no screen asks the age (controller's ruling: no new question in this wave). | A first question on age in hours that ends the walk above 72 h. | open: หน้าแรกบอกว่าใช้กับทารกอายุไม่เกิน 72 ชม. แต่ยังไม่มีข้อถามอายุ อยากให้เพิ่มข้อถามอายุไหม |
| F-I4 | Security | Important | `docs/SRS.md:262` | The SRS carried a remark about another app. | Removed; recorded privately. | fixed `be98735` |
| F-M1 | Code Smell | Minor | `src/flow/engine.ts:29`, `:35` | The engine stopped at `a[key] === true` for the yes/no and staff items, a second copy of the clinical-illness rule in `classify.ts`. If the two drifted apart, the walk could stop with a non-illness result. | Ask `clinicalIllnessReason(a)` after each item. [Fix F-M1](#f-m1) | fixed `5b51d95` |
| F-M2 | Bug | Minor | `src/ui/render.ts:62` | The 300 ms arming timer re-enabled "none" and "no value" blindly, outside the rule that keeps them disabled while a box is ticked or a number is typed. | Each screen hands back its own rule, and the timer runs it after re-enabling. [Fix F-M2](#f-m2) | fixed `5b51d95` |
| F-M3 | Bug | Minor | `src/ui/render.ts:133` | `type="number"`: a mouse wheel or arrow key on a ward PC could change the temperature or ROM after it was typed. | `type="text" inputmode="decimal"` with the same parse and range check; `autocomplete="off"`. | fixed `5b51d95` |
| F-M4 | Bug | Minor | `src/ui/render.ts:155` | A number field reports an unparseable entry ("37..") as empty, so "no value" became enabled while the box still showed text. | With a text field any text counts as typing; E2E 11 types "37..". | fixed `5b51d95` |
| F-M5 | Code Smell | Minor | `tests/unit/summary.test.ts:134` | The Thai check for `cultureNoAbx` looked only for `ABX`, which a text saying "give ABX" also passes. | Pin `ไม่ต้องให้ ABX`. | fixed `5b51d95` |
| F-M6 | Readability | Minor | `docs/SRS.md` 4.2 | The SRS said the band and timing edges "are set by matching the official site in the tests"; the fixture holds no case near 1.00 or 3.00. | Say that ≥ at two decimals is a KCMH choice, and how the timing buttons split 2 h and 4 h. | fixed `5b51d95` |
| F-M7 | Readability | Minor | `docs/SRS.md` 6; `tests/e2e/perf.spec.ts:5` | The SRS named "Playwright's Slow 3G profile", which does not exist; the test's 400 ms and 400 kbit/s had no source. | Name the profile; cite Chrome DevTools' 3G preset (400 kbit/s, 2 s added latency) and say the test is lighter. | fixed `5b51d95` |
| F-M9 | Readability | Minor | `docs/TDD.md`; `docs/CODE_REVIEW.md:7`; `README.md:15`; `docs/SRS.md` 6 | TDD described the engine as asking `classify` after every answer (true only after the respiratory items), misquoted the call-staff screen, and said out of scope gives no action. The header here left N3, B4 and B5 out of the open Important count. README said `npm test` runs unit tests only, SRS said it runs every tier. | Correct each. | fixed in the docs commit after `5b51d95` (the SRS part in `5b51d95`) |
| F-M10 | Code Smell | Minor | `tests/e2e/journeys.spec.ts` | No E2E for Back from a result, the call-staff screen or a Kaiser-not-computed result, and journey 2 did not check `Category: Equivocal`. | E2E 12, 13 and 14, and the assertion. | fixed `5b51d95` |
| F-M11 | Bug | Minor | `index.html:6`; `src/ui/render.ts:165` | No `color-scheme` meta, so form controls stay light in dark mode. The note's time stamp was the time the result screen opened: a note copied an hour later carried the earlier time. | The meta tag; the note is written again when Copy is tapped (E2E 15, fixed clock). | fixed `5b51d95` |
| F-M12 | Readability | Minor | `src/data/questions.ts:101` | The Tmax title said ไข้สูงสุด (highest fever), though an afebrile mother has a Tmax too. | `อุณหภูมิสูงสุดของแม่ระหว่างคลอด`, and the same word in the Kaiser-not-computed line. | fixed `5b51d95` |
| F-O1 | Security | Minor | `docs/superpowers/plans/2026-10-29-eos-abx-gate.md` | The implementation plan holds this PC's local paths and instructions written for agents. In a public repo they are published with it. | Remove the file or move it out of the repo before the first push. | fixed in the public release: Pp chose to move `docs/superpowers/` (the plan and the Task 15 notes) out of the repo, 2026-10-30 |
| F-O2 | Security | Minor | git history (every commit) | Every commit's author email is Pp's personal Gmail address; a public repo publishes it. | A GitHub noreply address in `git config user.email`, and a history rewrite before the first push (Pp's call). | fixed in the public release: Pp chose one commit with the GitHub noreply address, 2026-10-30 |
| P1 | Clinical rule | Important | `src/logic/classify.ts:34`, `:49`; `src/data/questions.ts:74`, `:86` | Pp's decision, 2026-10-29. The signs added up intermittent time (SRS 4.1 "cumulative, intermittent counts", from Kaiser's note), so signs that came and went for 2 h in total made a baby equivocal. Pp counts only continuous time, and a sign may be ticked only once it has lasted long enough. | The signs screen asks for signs continuous for 2 h or more (hint: เป็น ๆ หาย ๆ ไม่นับ). One sign asks whether it reached 4 h continuously; two or more are equivocal at once; no sign is well with a 2 h re-check. `twoParamsGe2h`, `anyParamGe4h` and `manyParamsOne4h` removed. The note's signs line says the signs were continuous ≥2 h and, for one sign, whether it reached 4 h. SRS D6, section 3 step 5, 4.1, 5 and 6; E2E 1, 1b, 1c, 2 and 10. | fixed `07d48c5` |
| P2 | Readability | Minor | `src/ui/render.ts:135`; `src/logic/recommend.ts:48`; `src/data/text.ts:48`, `:127` | Pp's answers, 2026-10-30, to three questions left by Task 15. The 4 h screen did not say which sign it asked about. The one-sign re-check line named only that sign, though a second sign lasting 2 h also makes the baby equivocal. A well baby given ABX for confirmed Triple I still saw "ถ้ามีอาการ ... ให้เปิดหน้านี้ใหม่", which can change nothing. | The 4 h screen shows the ticked sign in bold under its title. `signsAt4h` reads `ถ้าอาการนี้ต่อเนื่องครบ 4 ชม. หรือมีอาการอีกข้อต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่` (note: "... or a second sign lasts 2 h continuously"). `recommend()` drops every re-check when a well baby's action is ABX. SRS section 3 steps 5 and 8; E2E 1b, 1c and 5. | fixed `3c27c3e` |
| P3 | Clinical rule | Important | `src/data/questions.ts:78`, `:79`; `src/data/text.ts:57` | Pp's decision, 2026-10-30. Since F-C1 the signs screen asked about the whole time since the delivery room, so a sign that lasted 2 h and then resolved still made a baby equivocal. Pp counts a sign only while it is present at assessment. O₂ and CPAP keep the since-delivery-room window. | Signs screen `ตอนประเมิน มีข้อไหนที่ยังเป็นอยู่ และเป็นต่อเนื่องมา 2 ชม. ขึ้นไป`, hint `เลือกได้หลายข้อ หายไปแล้วหรือเป็น ๆ หาย ๆ ไม่นับ`; note label "Signs present at assessment, continuous ≥2 h". `classify()` unchanged, since it reads only the ticks. SRS section 3 step 5, 4.1 (time-window row, exception to D6), 5 and 6; TDD; E2E 1, 1b and 1c. | fixed `ead1e9b` |
| C1 | Bug | Minor | `src/logic/kaiser.ts:71` | `band(NaN)` returns `'observe'`. | None. | wontfix: `recommend()` fails closed to `kaiserUnavailable` before `band()` for any non-finite risk |
| C2 | Code Smell | Minor | `tests/unit/kaiser.test.ts:19` | The intercept tests cannot tell the site table from the formula: both give 57.9 at 0.5/1000. | None. | wontfix: the 20 site cases are the real check |
| C3 | Bug | Minor | `src/ui/render.ts:42` | Keyboard and screen-reader focus was lost on each screen change. | None. | wontfix: fixed in Task 8 (`6618931`), the new screen's h1 takes focus |
| C4 | Code Smell | Minor | `tests/e2e/journeys.spec.ts:137` | The double-tap E2E waits a fixed 50 ms. | None. | wontfix: the pause models the gap between two human taps |
| C5 | Code Smell | Minor | `package.json:4`; `src/data/config.ts:1` | The version string lives in two files. | None. | wontfix: small app, one release so far; revisit when versioning starts |

## Checked and found sound

- **CSP against the build.** `dist/index.html` holds one external module script and one external
  stylesheet, both same-origin, and nothing inline. No code in `src/` sets a `style` attribute or uses
  `innerHTML`; since N11 the bundle has no modulepreload polyfill at all. N1 tests this on every
  run. wrangler 4.155.0 sends `public/_headers` in the deploy metadata (its
  `wrangler-dist/cli.js`, `assets._headers`), so Cloudflare applies the same header in production;
  `curl -I` on the live URL after the first deploy would confirm it.
- **Every `Answers` field read before it is set.**
  - `flow/engine.ts` checks each field for `undefined` before it asks or moves on. Its early call to
    `classify()` reads only `gaWeeks`; unset items read as "no".
  - `ui/render.ts:112` reads `resp` and `o2Needed` for the sign list; both are answered first.
  - `logic/recommend.ts:14` checks GA, temperature, ROM, GBS and maternal antibiotics before Kaiser
    runs. A missing timing earns no credit.
  - `logic/cpgWell.ts` returns no leaf when an answer is missing, and `recommend()` then gives
    `incomplete` (N4), so no missing answer reads as "no" on the way to routine care.
  - `logic/summary.ts` prints a missing GA day as `+?`.
  - Back removes answers strictly last-in first-out, so no answer can outlive the one it depended on.
- **Thai labels in the E2E tests.** Rechecked at `5b51d95`: of the 47 Thai literals in `tests/e2e/`,
  42 appear in `src/data/questions.ts` or `src/data/text.ts` character for character, three come
  from templates (`+0 วัน`, the Kaiser line, the range message) and two are the test's own staff
  name. The `wk` labels come from the template at `questions.ts:22`. No mismatch.
- **Clinical numbers outside `src/logic/`.** None in `src/flow/` or `src/ui/`. The number screen's
  range check reads `min` and `max` from `src/data/questions.ts`.
- **No network, no storage.** No `fetch`, XHR, `sendBeacon`, `localStorage`, `sessionStorage` or
  cookie anywhere in `src/`. The only link is the Kaiser footer, which opens a new tab with
  `noopener noreferrer`.
- **Injection.** Every string, the staff name and the free-text reason included, reaches the page as
  a text node through `h()`.

## Fixes in full

Each block is the whole function or entry as committed (fixed rows) or as suggested (open rows).

### A1

`.gitattributes` (new):

```
* text=auto eol=lf
```

### A2

`index.html`, `<head>`:

```html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="referrer" content="no-referrer" />
<link rel="icon" href="data:," />
<title>EOS ABX Gate</title>
```

### A3

```ts
it('JS and CSS together are at most 100 KB gzipped (SRS section 6)', () => {
  const dir = join(process.cwd(), 'dist', 'assets');
  const files = readdirSync(dir).filter((f) => /\.(js|css)$/.test(f));
  // An empty build sums to 0 bytes and would pass the size check, so count the files first.
  expect(files.filter((f) => f.endsWith('.js')).length).toBeGreaterThan(0);
  expect(files.filter((f) => f.endsWith('.css')).length).toBeGreaterThan(0);
  const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
  expect(total).toBeLessThanOrEqual(100 * 1024);
});
```

### A4

`src/logic/kaiser.ts`:

```ts
export function formatPer1000(per1000: number): string {
  return round(per1000, 2).toFixed(2);
}

export function band(posteriorPer1000: number): 'observe' | 'cultureNoAbx' | 'cultureAbx' {
  const shown = Number(formatPer1000(posteriorPer1000));
  if (shown >= 3) return 'cultureAbx';
  if (shown >= 1) return 'cultureNoAbx';
  return 'observe';
}
```

`src/data/text.ts`, `RESULT_TH.kaiser` now takes the formatted text:

```ts
kaiser: (atBirth: string, afterExam: string, incidence: number) =>
  `Kaiser 2024 (incidence ${incidence}/1000) แรกเกิด ${atBirth}/1000 หลังประเมิน ${afterExam}/1000`,
```

`src/ui/render.ts` calls `RESULT_TH.kaiser(formatPer1000(r.kaiser.atBirth), formatPer1000(r.kaiser.afterExam), INCIDENCE_PER_1000)`,
and `src/logic/summary.ts` prints both numbers with `formatPer1000`.

### A5

```ts
answer<K extends AnswerKey>(key: K, value: Answers[K]): void {
  this.answers = { ...this.answers, [key]: value };
  if (!this.history.includes(key)) this.history.push(key);
}
```

### A6

`src/data/text.ts`: `otherText: 'เหตุผลสั้น ๆ ไม่ต้องใส่ชื่อหรือ HN'`. `src/ui/render.ts`:

```ts
function overrideScreen(v: View): HTMLElement {
  const s = h('section', { class: 'screen' }, heading(OVERRIDE_TH.title));
  const reasons = ['staffOrder', 'motherSevere', 'other'] as const;
  const radios = reasons.map((value) => {
    const r = h('input', { type: 'radio', name: 'reason', value }) as HTMLInputElement;
    s.append(h('label', { class: 'check' }, r, h('span', {}, OVERRIDE_TH.reasons[value])));
    return r;
  });
  // autocomplete off: a shared ward PC must not offer the last resident's text to the next one.
  const textBox = (label: string, maxlength: string) =>
    h('input', { type: 'text', 'aria-label': label, placeholder: label, maxlength, autocomplete: 'off' }) as HTMLInputElement;
  const other = textBox(OVERRIDE_TH.otherText, '80');
  const staff = textBox(OVERRIDE_TH.staff, '60');
  const error = h('p', { class: 'error', role: 'alert' });
  s.append(
    other,
    staff,
    error,
    button(OVERRIDE_TH.save, () => {
      const picked = radios.find((r) => r.checked)?.value as Override['reason'] | undefined;
      if (!picked || staff.value.trim() === '' || (picked === 'other' && other.value.trim() === '')) {
        error.textContent = OVERRIDE_TH.missing;
        return;
      }
      v.session.setOverride({ reason: picked, otherText: other.value.trim(), staff: staff.value.trim() });
      v.overrideOpen = false;
      render(v);
    }, 'primary'),
    button(OVERRIDE_TH.cancel, () => {
      v.overrideOpen = false;
      render(v);
    }),
  );
  return s;
}
```

### A7

```ts
function button(label: string, onClick: () => void, cls?: 'primary'): HTMLButtonElement {
  const b = h('button', cls ? { type: 'button', class: cls } : { type: 'button' }, label) as HTMLButtonElement;
  b.addEventListener('click', onClick);
  return b;
}
```

The other classes with no CSS rule (`screen`, `reason`, `recheck`, `status`, `noabx`) name parts of
the screen and cost nothing; they stay.

### A8

New tests, each in the file named:

- `engine.test.ts`: GBS-specific antibiotics ask `abxTiming`; `notRepeated` asks `suspected`;
  `repeatLower` asks `iapIndications`.
- `cpgWell.test.ts`: `{ fever: 'ge39', suspected: [], confirmed: ['placenta'] }` stays
  `isolatedFever` (deliberate: confirmed criteria count only on top of a suspected one).
- `summary.test.ts`: `GA <35 wk | Category: Out of scope (GA below 35 wk)`; an "other" override
  prints the typed reason.
- `recommend.test.ts`: equivocal with `gbs` or `matAbx` missing gives `kaiserUnavailable`.

### A9

```json
"devDependencies": {
  "@playwright/test": "1.64.1",
  "@types/node": "22.10.2",
  "typescript": "5.6.3",
  "vite": "5.4.21",
  "vitest": "2.1.9",
  "wrangler": "4.155.0"
}
```

### N1

New file `tests/e2e/csp.spec.ts`: it reads the `Content-Security-Policy` line from
`public/_headers`, adds it to every response through `page.route`, records every
`securitypolicyviolation` event and every CSP console error, walks journey 2 to the result and opens
and cancels the override form, then expects both lists empty. A last `fetch('/')` from the page must be
refused, which proves the header was in force. With an inline `<script>` added to `index.html` the test
fails (`script-src-elem inline`).

### N2

```ts
function questionScreen(v: View, key: AnswerKey): HTMLElement {
  const q = QUESTIONS[key];
  const s = h('section', { class: 'screen' }, heading(q.title));
  if (q.hint) s.append(h('p', { class: 'hint' }, q.hint));
  const commit = (value: Answers[AnswerKey]) => {
    v.session.answer(key, value);
    render(v);
  };

  if (q.kind === 'choice') {
    for (const o of q.options) s.append(button(o.label, () => commit(o.value as Answers[AnswerKey])));
  } else if (q.kind === 'multi') {
    const allowed = key === 'equivParams' ? new Set<string>(allowedEquivParams(v.session.answers)) : null;
    const boxes: HTMLInputElement[] = [];
    for (const o of q.options) {
      if (allowed && !allowed.has(o.value)) continue;
      const box = h('input', { type: 'checkbox', value: o.value }) as HTMLInputElement;
      boxes.push(box);
      s.append(h('label', { class: 'check' }, box, h('span', {}, o.label)));
    }
    const next = button(UI_TH.next, () => commit(boxes.filter((b) => b.checked).map((b) => b.value) as Answers[AnswerKey]), 'primary');
    const none = button(q.noneLabel, () => commit([]));
    next.disabled = true;
    // A checked box and "none" contradict each other, so only one of the two buttons works at a time.
    for (const b of boxes) {
      b.addEventListener('change', () => {
        const anyChecked = boxes.some((x) => x.checked);
        next.disabled = !anyChecked;
        none.disabled = anyChecked;
      });
    }
    s.append(next, none);
  } else {
    const input = h('input', {
      type: 'number',
      inputmode: 'decimal',
      step: String(q.step),
      min: String(q.min),
      max: String(q.max),
      'aria-label': q.title,
    }) as HTMLInputElement;
    const error = h('p', { class: 'error', role: 'alert' });
    const submit = () => {
      const n = Number(input.value);
      if (input.value.trim() === '' || !Number.isFinite(n) || n < q.min || n > q.max) {
        error.textContent = UI_TH.range(q.min, q.max);
        return;
      }
      commit(n);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    // A typed number and "no value" contradict each other: the box must be empty to pick no value.
    const noValue = button(q.noValueLabel, () => commit(null));
    input.addEventListener('input', () => (noValue.disabled = input.value.trim() !== ''));
    s.append(h('div', { class: 'number' }, input, h('span', {}, q.unit)), error, button(UI_TH.next, submit, 'primary'), noValue);
  }
  s.append(nav(v));
  return s;
}
```

### B1

As committed in `6296c67` (`step` was removed later with F-M3):

```ts
romHours: {
  kind: 'number',
  title: 'ถุงน้ำแตกก่อนคลอดกี่ชั่วโมง',
  unit: 'ชม.',
  min: 0,
  // The Kaiser site's own range (RangeValidator3, 0 to 240; 240.5 to 2000 refused, read 2026-10-29).
  max: 240,
  noValueLabel: 'ไม่ทราบ',
},
```

### B2

```ts
cultureNoAbx: 'ส่ง CBC กับ blood culture วัด VS ทุก 4 ชม. นาน 24 ชม. ไม่ต้องให้ ABX',
```

### B3

```ts
signsTooShort: 'มีอาการ แต่ยังเป็นไม่นานพอจะนับเป็น equivocal',
```

### B4

No change if Pp confirms. The alternative, a point estimate at +3 days, replaces the `atBirth` lines in
`recommend()`:

```ts
const atBirth = riskAtBirth({ ...input, gaDays: a.gaDays ?? 3 }, incidencePer1000);
```

### B6

`src/data/text.ts` gains `restartConfirm` (wording for Pp), and `nav()` asks before clearing:

```ts
function nav(v: View): HTMLElement {
  return h(
    'div',
    { class: 'nav' },
    button(UI_TH.back, () => {
      if (v.session.canGoBack()) v.session.back();
      else v.started = false;
      render(v);
    }),
    button(UI_TH.restart, () => {
      if (v.session.canGoBack() && !window.confirm(UI_TH.restartConfirm)) return;
      v.session.restart();
      v.started = false;
      render(v);
    }),
  );
}
```

### N3

As committed in `2731aad`, in the controller's wording:

```ts
hint: 'broad-spectrum คือ penicillin, ampicillin หรือ cefazolin ร่วมกับ aminoglycoside (เช่น gentamicin), aztreonam, azithromycin หรือ metronidazole หรือ cephalosporin รุ่น 2 ถึง 4, extended-spectrum penicillin, fluoroquinolone, carbapenem, tetracycline หรือ TMP-SMX ถ้าได้ ampicillin ร่วมกับ erythromycin ให้นับเป็น penicillin, ampicillin หรือ cefazolin อย่างเดียว',
```

### N4

As committed in `5b51d95`. `src/data/types.ts` gains the action `'incomplete'`, with the note text
`answers incomplete, no action computed; discuss with staff` and the Thai
`ยังตอบไม่ครบ หน้านี้เลยไม่มีคำแนะนำ ปรึกษา staff ก่อนตัดสินใจ`.

```ts
export function wellPath(a: Answers): WellPath | null {
  if (a.fever === undefined) return null;
  if (isDocumentedFever(a.fever)) {
    if (a.suspected === undefined) return null;
    if (a.suspected.length === 0) return 'isolatedFever';
    if (a.confirmed === undefined) return null;
    return a.confirmed.length > 0 ? 'confirmedTripleI' : 'suspectedTripleI';
  }
  if (a.iapIndications === undefined) return null;
  if (a.iapIndications.length === 0) return 'noIapIndication';
  if (a.adequateIap === undefined) return null;
  return a.adequateIap === true ? 'adequateIap' : 'inadequateIap';
}

// recommend(), well-appearing branch
const path = a.equivParams === undefined || pendingEquivTimingKey(a) !== null ? null : wellPath(a);
if (path === null) return { classification, action: 'incomplete' };
return { classification, action: wellAction(path), wellPath: path };
```

### N5

Done inside F-I1: the Kaiser inputs line reads `GA 40+? wk (days unknown: risk is the higher of +0
and +6 d)` when GA days were unknown. See [F-I1](#f-i1).

### N6

```ts
// src/data/config.ts
export const DEFINITIONS = { agreed: false, date: '2026-10-29', dateTh: '29 ต.ค. 2569' } as const;
export const DEFINITIONS_STATUS = DEFINITIONS.agreed
  ? `agreed by NICU team ${DEFINITIONS.date}`
  : `draft ${DEFINITIONS.date}, not yet agreed by NICU team`;
```

The draft item of `FOOTER.items` in `src/data/text.ts` is then built from `DEFINITIONS.agreed` and
`DEFINITIONS.dateTh`. Today the footer reads `Kaiser Permanente 2024` (the link) `· CPG EOS รพ.จุฬาฯ ·
นิยามฉบับร่าง · ไม่เก็บและไม่ส่งข้อมูล`; once agreed, `นิยามฉบับร่าง` gives way to the agreed wording with
the date (Thai wording from Pp).

### N7

```ts
type Option<V> = { label: string; value: V };
type QuestionFor<V> =
  | { kind: 'choice'; title: string; hint?: string; options: Option<V>[] }
  | { kind: 'multi'; title: string; hint?: string; options: Option<V extends (infer E)[] ? E : never>[]; noneLabel: string }
  | { kind: 'number'; title: string; hint?: string; unit: string; min: number; max: number; step: number; noValueLabel: string };

export const QUESTIONS: { [K in AnswerKey]: QuestionFor<NonNullable<Answers[K]> | (null extends Answers[K] ? null : never)> } = {
  // entries unchanged; a misspelt value is now a tsc error
};
```

### N8

```ts
// src/logic/kaiser.ts
export function needsAbxTiming(matAbx: MatAbx): boolean {
  return matAbx === 'gbsSpecific' || matAbx === 'broad';
}

// src/flow/engine.ts
function nextKaiserStep(a: Answers): Step {
  if (a.gaDays === undefined) return ask('gaDays');
  if (a.tmaxC === undefined) return ask('tmaxC');
  if (a.tmaxC === null) return RESULT;
  if (a.romHours === undefined) return ask('romHours');
  if (a.romHours === null) return RESULT;
  if (a.gbs === undefined) return ask('gbs');
  if (a.matAbx === undefined) return ask('matAbx');
  if (needsAbxTiming(a.matAbx) && a.abxTiming === undefined) return ask('abxTiming');
  return RESULT;
}
```

### N9

The suggestion as first written; the committed version (`5b51d95`) also writes the note again when
Copy is tapped (F-M11), and appends the override button only when `r.action !== 'outOfScope'`.

```ts
function resultScreen(v: View): HTMLElement {
  const a = v.session.answers;
  const r = recommend(a, INCIDENCE_PER_1000);
  const text = summaryText(a, r, v.now(), INCIDENCE_PER_1000);
  const givesAbx = r.action === 'abx' || r.action === 'cultureAbx';
  const s = h(
    'section',
    { class: `screen result ${givesAbx ? 'abx' : 'noabx'}` },
    heading(RESULT_TH.category[r.classification.category]),
    h('p', { class: 'reason' }, RESULT_TH.reason[r.classification.reason]),
    h('p', { class: 'action' }, RESULT_TH.action[r.action]),
  );
  if (r.kaiser) {
    const line = RESULT_TH.kaiser(formatPer1000(r.kaiser.atBirth), formatPer1000(r.kaiser.afterExam), INCIDENCE_PER_1000);
    s.append(h('p', {}, line));
  }
  for (const rc of r.classification.rechecks) s.append(h('p', { class: 'recheck' }, RESULT_TH.recheck[rc]));
  const pre = h('pre', { 'data-testid': 'summary' }, text);
  const status = h('p', { class: 'status', role: 'status' });
  s.append(pre, status, button(UI_TH.copy, () => void copy(text, pre, status), 'primary'));
  if (r.action !== 'outOfScope') {
    s.append(
      button(UI_TH.override, () => {
        v.overrideOpen = true;
        render(v);
      }),
    );
  }
  s.append(nav(v));
  return s;
}
```

### N10

`src/data/text.ts` gains this Thai map, committed in `8e13bcd`; the redesign (`58ce94e`) puts it on
screen:

```ts
wellPath: {
  confirmedTripleI: 'แม่มีไข้ และเข้าเกณฑ์ confirmed Triple I',
  suspectedTripleI: 'แม่มีไข้ และเข้าเกณฑ์ suspected Triple I',
  isolatedFever: 'แม่มีไข้อย่างเดียว ไม่เข้าเกณฑ์ Triple I',
  noIapIndication: 'แม่ไม่มีไข้ และไม่มีข้อบ่งชี้ GBS IAP',
  adequateIap: 'แม่ไม่มีไข้ มีข้อบ่งชี้ GBS IAP และได้ IAP ครบ',
  inadequateIap: 'แม่ไม่มีไข้ มีข้อบ่งชี้ GBS IAP แต่ IAP ไม่ครบหรือไม่ทราบ',
} satisfies Record<WellPath, string>,
```

and `resultScreen()` adds it to the ดูเหตุผลและข้อความ details, after the reason line:
`if (r.wellPath) lines.push(h('p', {}, RESULT_TH.wellPath[r.wellPath]));`.

### N11

As committed in `5b51d95`, with a comment on why:

```ts
export default defineConfig({
  build: { target: 'es2020', sourcemap: false, modulePreload: { polyfill: false } },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/perf/**/*.test.ts'],
    environment: 'node',
  },
});
```

### F-C1

`src/data/questions.ts` (the `cpapAtUnit` entry is gone):

```ts
resp: { kind: 'choice', title: 'ตั้งแต่ออกจากห้องคลอด ต้องใช้อะไรช่วยหายใจมากที่สุด', options: [/* ไม่ใช้, O₂, CPAP, HFNC หรือ ventilator */] },
o2Ge2h: { kind: 'choice', title: 'ใช้ O₂ มานานรวมเท่าไร นับตั้งแต่ออกจากห้องคลอด', options: yesNo('2 ชม. ขึ้นไป', 'ยังไม่ถึง 2 ชม.') },
equivParams: { kind: 'multi', title: 'ตั้งแต่ออกจากห้องคลอด มีข้อไหนบ้าง', hint: 'เลือกได้หลายข้อ เป็น ๆ หาย ๆ หรือหายไปแล้วก็นับ', /* options unchanged */ },
```

`src/logic/classify.ts`:

```ts
// resp is the most support needed since leaving the delivery room, so CPAP here was needed at SCN
// or NICU (SRS D7); support used only in the delivery room is outside the question.
if (a.resp === 'cpap') return 'cpap';
```

### F-I1

`src/logic/summary.ts`, two lines after the category line:

```ts
function signsLine(a: Answers, r: Result): string | null {
  const { category } = r.classification;
  if (category !== 'equivocal' && category !== 'well') return null;
  const signs = effectiveParams(a).map((p) => SUMMARY.signs[p]);
  return `Signs since delivery room: ${signs.length > 0 ? signs.join(', ') : 'none'}`;
}

function kaiserInputsLine(a: Answers, r: Result): string | null {
  if (!r.kaiser || a.gaWeeks === undefined || a.tmaxC == null || a.romHours == null || !a.gbs || !a.matAbx) return null;
  const ga = a.gaDays == null ? `GA ${a.gaWeeks}+? wk (${SUMMARY.gaDaysUnknown})` : `GA ${a.gaWeeks}+${a.gaDays} wk`;
  const abx = a.abxTiming ? `${SUMMARY.matAbx[a.matAbx]}, ${SUMMARY.abxTiming[a.abxTiming]}` : SUMMARY.matAbx[a.matAbx];
  return [
    `Kaiser inputs: ${ga}`,
    `Tmax ${oneDecimal(a.tmaxC)} °C (${cToF(a.tmaxC).toFixed(2)} °F)`,
    `ROM ${a.romHours} h`,
    `GBS ${SUMMARY.gbs[a.gbs]}`,
    `maternal abx ${abx}`,
  ].join(', ');
}
```

### F-I2

```ts
// The Kaiser site converts a °C entry without rounding. Rounding to 2 decimals here equals the
// unrounded value for the one-decimal entries the page accepts and removes float noise (SRS 4.2).
export function cToF(c: number): number {
  return round((c * 9) / 5 + 32, 2);
}
```

SRS 4.2 drops "rounded to 0.1", the `cToF` table in `tests/unit/kaiser.test.ts` expects 100.76 for
38.2 °C, and `it.fails.each(celsiusCases)` became `it.each`. The 20 cases entered in °F are unaffected,
because a °F entry needs no conversion.

### F-M1

```ts
for (const key of YES_NO_ITEMS) {
  if (a[key] === undefined) return ask(key);
  if (clinicalIllnessReason(a)) return RESULT;
}
for (const [item, check] of STAFF_ITEMS) {
  if (a[item] === undefined) return ask(item);
  if (a[item] === true) {
    if (a[check] === undefined) return ask(check);
    if (a[check] !== true) return NEED_STAFF;
  }
  if (clinicalIllnessReason(a)) return RESULT;
}
```

### F-M2

`questionScreen()` returns `{ el, sync }`, where `sync` is the screen's rule (for a multi-select:
`next.disabled = !anyChecked; none.disabled = anyChecked`; for a number box:
`noValue.disabled = input.value.trim() !== ''`), used by its own change or input listener. The
arming timer runs it last:

```ts
setTimeout(() => {
  for (const el of armed) {
    el.disabled = false;
    el.classList.remove('arming');
  }
  // Invariant: "none" is disabled while a box is ticked, and "no value" while the number box holds
  // text. Blind re-enabling could break it, so the screen's own rule runs last.
  sync?.();
}, ARM_DELAY_MS);
```

### N13

```ts
export class Session {
  private current: Answers = {};
  private history: AnswerKey[] = [];

  get answers(): Readonly<Answers> {
    return this.current;
  }
  // answer(), back(), restart() and setOverride() write this.current instead of this.answers
}
```

### N14

```ts
// src/data/types.ts
gaWeeks?: number | 'below35';
// src/logic/classify.ts
if (a.gaWeeks === 'below35') return { category: 'outOfScope', reason: 'gaBelow35', rechecks: [] };
```

`QUESTIONS.gaWeeks` then offers `{ label: 'ต่ำกว่า 35 wk', value: 'below35' }`, and `recommend()` and
`summary.ts` read the same value.
