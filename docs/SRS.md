# EOS ABX Gate: Software Requirements Specification

Version 0.1 (draft) · 2026-10-29 · Owner: Pp (Valhalla Team, KCMH NICU) · Status: waiting for Pp's review

## 1. Context

**Problem.** Residents at KCMH start empiric antibiotics for suspected early-onset sepsis (EOS) without
walking through the KCMH EOS guideline or the Kaiser calculator. The main error is classification: a
baby with mild respiratory distress gets called "clinical illness", and clinical illness means
antibiotics at once.

**What the app does.** One web page that a resident taps through before starting antibiotics in a
baby ≥35 weeks. It asks one measurable fact per screen, decides the category itself (clinical illness,
equivocal, well-appearing, or not yet), runs the Kaiser 2024 model for equivocal babies, and ends with
the KCMH guideline's action plus a summary to paste into the progress note.

**Users.** Residents and fellows in the nursery, SCN and NICU at KCMH, on a ward PC or a phone, for
babies ≥35 weeks up to 72 hours old (the early-onset window). The start screen states the age limit;
the page does not ask the age.

**Success.** Fewer antibiotic starts in babies ≥35 weeks with no rise in missed EOS, measured by the
monthly chart audit (section 7). The page itself stores nothing, so it cannot measure itself.

### Decisions (all Pp's, 2026-10-29)

| # | Decision |
|---|---|
| D1 | Standalone page. No login, no stored data, no patient identifiers. |
| D2 | Least effort: one question per screen, tap to answer, auto-advance until the result. |
| D3 | Logic follows the KCMH EOS CPG flowchart (newborn ≥35 wk). Kaiser is used only in the equivocal branch, as the CPG says. |
| D4 | Kaiser **2024** model, computed in the page. KCMH screens almost every mother for GBS, and Kaiser recommends the 2024 model where screening is universal. |
| D5 | Incidence 0.5/1000 live births (CDC) until KCMH's own rate is available. One constant. |
| D6 | Definitions: for every item, the broader of the KCMH CPG and the Kaiser table, asked as a measurable question (section 4.1). One exception: O₂ counts only when needed to keep SpO₂ >90%. |
| | A second exception (Pp, 2026-10-29): an equivocal sign counts only for the time it lasted without a break. Intermittent episodes are not added, which is stricter than Kaiser's note that the abnormality can be intermittent (section 4.1). |
| D7 | CPAP, HFNC or ventilator used only in the delivery room does not count; needed at SCN or NICU, that is at any time after leaving the delivery room, counts as clinical illness. |
| D8 | Override allowed: the resident picks a reason and names the staff who agreed. |
| D9 | Hosting: Cloudflare Workers, public repo `valhalla-health/eos-abx-gate`, URL `eos-abx-gate.valhalla-health.workers.dev`. |
| D10 | No one checks the summary before dose 1. A monthly chart audit is the only enforcement. |

### Non-goals

- Babies <35 weeks, babies older than 72 hours (late-onset sepsis), antibiotic choice or dose,
  antibiotic stop decisions.
- Any login, database, analytics, cookies or network call after the page loads. The page's own font files (same origin, no data sent) are fetched right after `load`; nothing else is.
- Patient name, HN, date of birth, or any free-text field that invites them (except the staff name in an override).
- Blocking an order. The page advises; the resident decides.

## 2. Architecture

Static site: Vite + TypeScript, no UI framework, built to `dist/` and served as Cloudflare Workers
static assets. Workers Builds deploys on every merge into `main`, the same route NeoRef uses.

Four tiers. Clinical rules live only in Business Logic.

| Tier | Folder | Holds | Never holds |
|---|---|---|---|
| Data Access (Model) | `src/data/` | Kaiser 2024 coefficients, LRs, KPNC base rate, incidence constant; CPG definitions and thresholds; antibiotic class lists; Thai question and result text | Logic, DOM |
| Business Logic (Service) | `src/logic/` | `classify` (category), `kaiser` (risk at birth, posterior, band), `cpgWell` (well-appearing branch), `recommend` (final action), `summary` (note text). Pure functions, no DOM, no I/O. | DOM, timers, storage |
| Orchestration (Controller) | `src/flow/` | Question graph: given the answers so far, which screen comes next; back and restart | Clinical thresholds |
| Presentation (View) | `src/ui/` | Renders one screen, buttons, number pad, result, copy button | Clinical thresholds |

Privacy by construction: answers live in memory only and vanish on reload or restart. No
`localStorage`, no service worker in v1, a Content-Security-Policy with `connect-src 'none'`.

## 3. Core workflows

1. **Start.** Screen: the title, "ใช้ก่อนเริ่ม ABX ในทารกที่สงสัย EOS กดตอบทีละข้อจนได้คำตอบ", the limits as two pills ("GA 35 wk ขึ้นไป", "อายุไม่เกิน 72 ชม."), and one button: เริ่ม. The footer credits the Kaiser Permanente calculator with a link and says the page neither keeps nor sends data.
2. **GA.** Buttons 35 to 42 weeks, plus "ต่ำกว่า 35". Below 35 → out-of-scope result ("ใช้หน้านี้ไม่ได้", then "GA ต่ำกว่า 35 wk ปรึกษา staff"), end.
3. **Respiratory support** (asked first because it is the commonest mistake). The question covers the whole time since leaving the delivery room, not only now: "ตั้งแต่ออกจากห้องคลอด ต้องใช้อะไรช่วยหายใจมากที่สุด": none / O₂ / CPAP, HFNC or ventilator. Support used only in the delivery room is outside the question (D7).
   - CPAP, HFNC or ventilator → it was needed at SCN or NICU, so clinical illness (step 9).
   - O₂ → "ต้องใช้ O₂ เพื่อให้ SpO₂ มากกว่า 90% ไหม". No → O₂ does not count, continue. Yes → "ใช้ O₂ มานานรวมเท่าไร นับตั้งแต่ออกจากห้องคลอด" (total time): <2 h / ≥2 h. ≥2 h → clinical illness. <2 h → mark "re-check at 2 h on O₂", continue.
4. **Other clinical-illness items**, one yes/no screen each, stop at the first yes → clinical illness:
   1. Vasoactive drug, or a fluid bolus given for hypotension or CRT >3 s.
   2. Seizure.
   3. 5-minute Apgar <5.
   4. Apnea: a pause ≥20 s, or a shorter pause with HR <100 or a fall in SpO₂.
   5. Poor feeding: unable or refusing to feed for 2 feeds in a row, needing OG or IV. Yes → "staff เช็กเองแล้วหรือยัง". Not yet → screen "ให้ staff มาดูก่อน" with a back button; the item does not count until checked.
   6. Lethargy or irritability: only "staff ดูเองแล้วเห็นว่าซึมหรือกระสับกระส่ายจริง" counts. Same staff-check screen as above.
5. **Equivocal parameters.** Only continuous time counts (Pp, 2026-10-29): a sign may be ticked only once it has lasted 2 h without a break, and a sign that came and went is not ticked. Only a sign still present at assessment counts (Pp, 2026-10-30): one that has resolved is not ticked, however long it lasted. O₂ and CPAP (step 3) still count since the delivery room. "ตอนประเมิน มีข้อไหนที่ยังเป็นอยู่ และเป็นต่อเนื่องมา 2 ชม. ขึ้นไป", hint "เลือกได้หลายข้อ หายไปแล้วหรือเป็น ๆ หาย ๆ ไม่นับ". Multi-select, at least one choice: HR ≥160 · RR ≥60 · T ≥38.0 °C or <36.5 °C · grunting, flaring or retraction without O₂ · ไม่มีเลย. Respiratory distress cannot be picked when step 3 found O₂ needed to keep SpO₂ >90% (counted there); O₂ given while SpO₂ was already >90% does not block it.
   - None → well-appearing (step 7), mark "re-check at 2 h": a sign that later lasts 2 h continuously means running the page again.
   - One → "ข้อนี้เป็นต่อเนื่องนานถึง 4 ชม. หรือยัง", with the ticked sign's name under the title (Pp, 2026-10-30): ถึงแล้ว / ยังไม่ถึง. ถึงแล้ว → equivocal. ยังไม่ถึง → well-appearing, mark "re-check at 4 h": the sign reaching 4 h continuously, or a second sign lasting 2 h continuously, means running the page again (Pp, 2026-10-30).
   - Two or more → equivocal at once, with no duration question.
6. **Kaiser (equivocal only).**
   1. GA days: buttons 0 to 6, plus "ไม่ทราบ".
   2. Highest maternal intrapartum temperature, °C, number pad, one decimal. A fever within 1 h after delivery counts (Kaiser FAQ).
   3. ROM duration, hours, number pad, 0 to 240 h: the range the Kaiser site accepts (it refuses more than 240 h). A longer ROM is entered as ไม่ทราบ, so Kaiser does not run (section 4.4). The ROM screen says so under its title: "ถ้านานกว่า 240 ชม. กดไม่ทราบ".

   Number answers take plain decimals only: digits with an optional point and digits ("38", "37.5"), or a point and digits (".5" for a 30-minute ROM). Anything else ("0x26", "1e2", "38.", "-1", "38,2", Thai digits) or a value outside the range shows "ใส่ตัวเลขระหว่าง min ถึง max".
   4. Maternal GBS: positive / negative / unknown.
   5. Maternal antibiotics before delivery: none · penicillin, ampicillin or cefazolin only · broad-spectrum · clindamycin, vancomycin or erythromycin only. The broad-spectrum list (section 4.2) sits behind "ดูรายชื่อยา broad-spectrum", one rule per line.
   6. If an antibiotic was given: timing before delivery: ≥4 h / 2 to 3.9 h / <2 h / ไม่ทราบ.
   7. Compute risk at birth and posterior with the equivocal LR, show both, go to the result.
7. **Well-appearing branch (CPG).**
   1. "แม่มีไข้ระหว่างคลอดไหม": ≥39.0 °C once / 38.0–38.9 °C and still ≥38.0 °C on a repeat 30 min later / 38.0–38.9 °C, repeat lower / 38.0–38.9 °C, not repeated / no fever.
   2. Documented fever (first, second or fourth answer) → suspected Triple I criteria, one multi-select: baseline FHR >160 for ≥10 min · maternal WBC >15,000 without steroids · purulent fluid from the cervical os · none. Any → confirmed criteria multi-select: positive amniotic-fluid Gram stain · low amniotic-fluid glucose or positive culture · placental pathology showing infection · none or not done.
      - Confirmed Triple I → admit, CBC, blood culture, empiric antibiotics.
      - Isolated fever or suspected Triple I → serial assessment with VS 48–72 h, no lab, no antibiotics.
   3. No documented fever → "มีข้อบ่งชี้ GBS IAP ไหม" multi-select: GBS bacteriuria this pregnancy · previous infant with invasive GBS · GBS culture positive this pregnancy · 35+0 to 36+6 wk with true labor and/or ROM · ≥37 wk with ROM ≥18 h · none.
      - None → routine care.
      - Any → "ได้ penicillin, ampicillin หรือ cefazolin ตั้งแต่ 4 ชม. ก่อนคลอดไหม". Yes → routine care. No or unknown → serial assessment with VS 48–72 h.
8. **Re-check.** When step 3 or 5 marked a re-check, the result says when to run the page again ("ถ้ายังใช้ O₂ อยู่ตอนครบ 2 ชม. ให้เปิดหน้านี้ใหม่"). The page keeps no timer. A well-appearing baby with confirmed Triple I already gets Admit Sick NB and antibiotics, so that result drops every re-check, on the screen and in the note (Pp, 2026-10-30).
9. **Result.** Short lines, the decision first (Pp, 2026-10-29). Top to bottom:
   1. A banner whose headline is the screen's heading and says the decision in words, with one line of what to do under it. The banner's colour comes from the action's tone (crit, warn, ok or neutral, the same colours as NeoFeed), never from the brand orange.

      | Action | Headline | Line | Tone |
      |---|---|---|---|
      | Clinical illness, or confirmed Triple I | ให้ ABX | Admit Sick NB · CBC + H/C · empiric ABX | crit |
      | Kaiser ≥3/1000 | ให้ ABX | CBC + H/C · empiric ABX | crit |
      | Kaiser 1 to under 3/1000 | ยังไม่ให้ ABX | CBC + H/C · VS ทุก 4 ชม. นาน 24 ชม. | warn |
      | Kaiser under 1/1000 | ไม่ให้ ABX | Serial PE + VS · ไม่ต้องส่ง lab | ok |
      | Well, isolated fever or suspected Triple I or IAP not adequate | ไม่ให้ ABX | Serial assessment + VS 48–72 ชม. | ok |
      | Well, routine care | ไม่ให้ ABX | ดูแลตามปกติที่ nursery | ok |
      | Kaiser not computed | ปรึกษา staff | ข้อมูลไม่พอคำนวณ Kaiser | neutral |
      | GA below 35 wk | ใช้หน้านี้ไม่ได้ | GA ต่ำกว่า 35 wk ปรึกษา staff | neutral |

   2. Pills: the category (Clinical illness, Equivocal or Well-appearing) and, when Kaiser ran, the risk after exam ("Kaiser 1.06/1000").
   3. Each re-check note on its own bold line.
   4. The copy button, คัดลอกข้อความสรุป, which copies the note without showing it.
   5. "ดูเหตุผลและข้อความ", closed at first: the reason, the CPG path of a well-appearing baby, the Kaiser model and incidence with the risks at birth and after exam, and the note itself.
   6. "จะให้ ABX ต่างจากนี้", a small text button. The GA <35 wk screen has none, since it gives no recommendation.
   7. ย้อนกลับ and เริ่มใหม่ side by side.
10. **Override.** Reason (staff สั่ง · แม่ป่วยหนัก เช่น bacteremia หรือ septic shock · อื่น ๆ พิมพ์สั้น ๆ) and the staff's name. Both required. Added to the summary.
11. **Back and restart.** Back returns to the previous screen with answers kept. Restart clears everything.

Clinical illness at any step goes straight to the result. A baby who needed CPAP at SCN reaches "ให้ ABX" one tap after GA; a baby on a vasoactive drug, two taps after GA.

## 4. Domain knowledge

### 4.1 Definitions (D6, the broader of CPG and Kaiser)

| Category | Item | Rule in the page | Source |
|---|---|---|---|
| Clinical illness | Respiratory support | CPAP, HFNC or ventilator needed at SCN or NICU (any time after the delivery room) | CPG + Kaiser + D7 |
| | O₂ | needed to keep SpO₂ >90%, for ≥2 h outside the delivery room | Kaiser (exception to D6) |
| | Circulation | vasoactive drug, or fluid bolus for hypotension or CRT >3 s | CPG; threshold drafted |
| | Perinatal depression | seizure, or 5-min Apgar <5 | Kaiser |
| | Lethargy, irritability | counts only after a staff check | CPG; staff check drafted |
| | Apnea | pause ≥20 s, or shorter with HR <100 or desaturation | CPG; threshold drafted (AAP apnea definition) |
| | Poor feeding | 2 feeds in a row missed, needing OG or IV, staff-checked | CPG; threshold drafted |
| | Time window | any time in the admission | CPG |
| Equivocal | Parameters | HR ≥160 · RR ≥60 · T ≥38.0 °C or <36.5 °C · grunting, flaring or retraction without O₂ | Kaiser (HR, RR, high T); CPG (low T) |
| | Duration | one sign continuous ≥4 h, or two or more continuous ≥2 h; intermittent episodes are not added (Pp, 2026-10-29; stricter than Kaiser's "abnormality can be intermittent") | Kaiser (thresholds); Pp (continuous time, exception to D6) |
| | Time window | only signs still present at assessment; a resolved sign does not count, however long it lasted (Pp, 2026-10-30). Clinical illness keeps "any time in the admission". | Pp (exception to D6) |
| Well-appearing | | none of the above | |

"Drafted" thresholds were added in this SRS to make a CPG item measurable. Pp and the NICU team must
agree them before release (section 7).

### 4.2 Kaiser 2024 model

Source: Kaiser "FAQ 2024 EOS Calculator Model Update" page; Kuzniewicz et al., Pediatrics 2024;154(4),
doi:10.1542/peds.2023-065267.

Risk at birth = 1 / (1 + e^(−βx)), where

βx = β₁ + 0.85194656·T + (−7.72247124)·GA + 0.09842383·GA² + 0.86770862·ROM′ + (−2.13142945)·Abx1 + (−2.33985917)·Abx2 + 1.02265353·GBSpos + 1.13710111·GBSunk

| Term | Input |
|---|---|
| T | highest maternal temperature in °F: °C × 9/5 + 32 (the Kaiser site does not round; the page rounds to 2 decimals, which is exact for one-decimal entries) |
| GA | weeks + days/7 |
| ROM′ | (ROM hours + 0.05)^0.2 |
| Abx1 | 1 if penicillin, ampicillin or cefazolin ≥2 h before delivery, or broad-spectrum 2–3.9 h before |
| Abx2 | 1 if broad-spectrum ≥4 h before delivery |
| GBSpos, GBSunk | indicator for GBS positive, GBS unknown (negative is the reference) |

Intercept for incidence τ (per live birth): the page uses Kaiser's table value, rounded to 0.1, because
the official site does (57.9 at 0.5/1000, read from the site's 2024 incidence list on 2026-10-29). The
formula β₁ = 57.29929499 + ln(τ/(1−τ)) − ln(ȳ/(1−ȳ)), with ȳ = 0.0002763 (KPNC rate), reproduces every
table value to 0.1 and is the fallback for an incidence not in the table. Checked on the site
2026-10-29: GA 40+0, 98.6 °F, ROM 10 h, GBS negative, no antibiotics gives 0.29 at birth and 1.06
equivocal; the equation above with 57.9 and odds-based Bayes gives the same.

Posterior for an equivocal baby: posterior odds = prior odds × 3.65. (2024 LRs: clinical illness 14.5,
equivocal 3.65, well 0.36; only equivocal is used, per D3.)

Equivocal action by posterior risk per 1000 (CPG equivocal box mapped to Kaiser bands):

| Posterior | Action |
|---|---|
| <1 | serial PE with VS, no lab, no antibiotics |
| 1 to <3 | CBC and blood culture, VS q4h for 24 h, no antibiotics |
| ≥3 | CBC, blood culture, empiric antibiotics |

Band edges are a KCMH choice, not a match to the site: the page compares the posterior with ≥ at the
two decimals it shows (1.00 is culture without antibiotics, 3.00 is antibiotics). The site fixture
holds no case near 1.00 or 3.00, so the tests do not show how the site treats an edge. Antibiotic
timing has no numeric edge to match either: Kaiser's FAQ writes ">2" and ">4" h, the site takes the
timing as a radio button, and the page's buttons put exactly 2 h in "2 to 3.9 h" and exactly 4 h in
"≥4 h".

Antibiotic classes (Kaiser 2024 FAQ): GBS-specific = penicillin, ampicillin, cefazolin. Broad-spectrum
= a GBS-specific drug plus an aminoglycoside, aztreonam, azithromycin or metronidazole; or 2nd- to
4th-generation cephalosporins, extended-spectrum penicillins, fluoroquinolones, carbapenems,
tetracyclines, TMP-SMX. Clindamycin, vancomycin or erythromycin alone = no antibiotics. When both were
given, use the broadest completed course.

### 4.3 CPG well-appearing branch

From `Neonatal Early Onset Sepsis (EOS) Guideline.pdf` (KCMH): documented fever = ≥39.0 °C once, or
38.0–38.9 °C still ≥38.0 °C 30 min later. Suspected Triple I = fever without a clear source plus one of
the three maternal criteria in step 7.2. Confirmed Triple I = suspected plus one of the three
amniotic-fluid or placental criteria. Adequate GBS IAP = penicillin, ampicillin or cefazolin ≥4 h
before delivery (AAP 2019; the CPG names IAP adequacy without defining it).

Serial assessment with VS: nurse assessment once per shift; VS every 4 h for 24 h, then every 4–8 h until
discharge.

### 4.4 Missing-data rules

| Missing | Rule | Why |
|---|---|---|
| Any answer | No defaults. The next screen opens only after a tap. If the logic is ever asked for a well-appearing result with a sign, duration or CPG answer missing, it returns "answers incomplete, discuss with staff" instead of an action (the page itself never asks that early). | Forces the resident to look; a missing answer must not read as "no". |
| GA days | "ไม่ทราบ" → the higher of the 0-day and 6-day risk (Pp confirmed, 2026-10-30) | The GA term is convex (lowest near 39 wk), so the higher-risk end of the week depends on GA. |
| Maternal Tmax or ROM hours | Kaiser cannot run. Result: equivocal, "คำนวณ Kaiser ไม่ได้ ปรึกษา staff ก่อนตัดสินใจ", no action advised. | The model needs both; guessing either could hide a high risk. |
| Antibiotic timing | "ไม่ทราบ" → counted as <2 h (no antibiotic credit) | Conservative. |
| Fever not repeated | Counted as documented fever | In a well baby this leads only to serial assessment. |
| Amniotic fluid or placenta not tested | Counted as criterion not met | Most mothers have none at birth; if pathology comes back positive later, re-run the page. |
| GBS status | "unknown" is a model category, not missing data | |

## 5. Summary text

Plain text, no identifiers, ready to paste. The note repeats what the resident entered, so a wrong
tap can be seen in the chart: the signs ticked (equivocal and well-appearing paths), each present at
assessment and continuous for 2 h or more, and for one sign whether it reached 4 h ("RR ≥60 (reached 4 h)" or "(not yet 4 h)");
and, when Kaiser ran, one line of its inputs. When GA days were unknown, that line says the risk is the higher of the
+0 and +6 day risk. The time stamp is taken when Copy is tapped, so a note copied later carries the
time of the copy.

```
EOS ABX Gate v0.1.0 | 2026-10-29 14:32
GA 40+0 wk | Category: Equivocal (two or more signs continuous for 2 h or more)
Signs present at assessment, continuous ≥2 h: RR ≥60, grunting/flaring/retraction without O2
Kaiser inputs: GA 40+0 wk, Tmax 37.0 °C (98.60 °F), ROM 10 h, GBS neg, maternal abx none
Kaiser 2024, incidence 0.5/1000: at birth 0.29/1000, after exam 1.06/1000
Action (KCMH CPG): CBC + blood culture, VS q4h x 24 h, NO antibiotics
Override: none
Definitions: draft 2026-10-29, not yet agreed by NICU team
```

This is site case c01 (journey 2); `tests/unit/summary.test.ts` pins the same text. With GA days
unknown the inputs line starts `Kaiser inputs: GA 40+? wk (days unknown: risk is the higher of +0 and
+6 d)`.

## 6. Testing

Three tiers. `npm test` runs Vitest: the unit tests and the performance folder, where the bundle-size
check is skipped unless `RUN_TEST_SUITE=full`. `npm run test:e2e` runs the Playwright journeys (the
load-time check is skipped there too). `npm run test:full` builds the page and runs every tier with
`RUN_TEST_SUITE=full`.

**Unit (Vitest), `src/logic/` only.**
- Kaiser: at least 20 cases entered by hand into the official site (2024 version, incidence 0.5),
  covering GA 35–42, Tmax, ROM 0–48 h, each GBS status and each antibiotic class and timing. Risk at
  birth and equivocal posterior must match the site to the site's displayed precision. The recorded
  site outputs live in `tests/fixtures/kaiser-site-2024.json` with the date they were taken. 20 cases
  were entered on the site in °F and 4 in °C (c21 to c24); the °C cases are run through the page's
  own `cToF` and match the site.
- Intercept: the formula reproduces every row of Kaiser's intercept table to 0.1.
- Classification: one test per row of 4.1, including both sides of every edge (HR 159/160, RR 59/60,
  T 36.4/36.5 and 37.9/38.0, O₂ just under and at 2 h since the delivery room, distress on O₂ not
  counted as equivocal, a sign present at assessment and continuous for 4 h counted, two or
  more signs equivocal with no duration answer, no sign giving the 2 h re-check).
- CPG branch: one test per leaf of the flowchart.
- Missing data: one test per row of 4.4.

**E2E (Playwright), the built page.**
1. Mild grunting on room air for 1 h, no other sign → nothing ticked (ไม่มีเลย) → well-appearing, re-check at 2 h, no antibiotics.
   1b. One sign continuous for 3 h → the 4 h screen names the sign → ยังไม่ถึง → well-appearing, re-check at 4 h or a second sign at 2 h.
   1c. One sign continuous for 4 h, low-risk mother → ถึงแล้ว → equivocal → Kaiser → no antibiotics.
2. RR ≥60 and grunting, each continuous for 2 h, low-risk mother → equivocal with no duration question → Kaiser → no antibiotics.
3. CPAP needed after the delivery room → clinical illness → antibiotics one tap after GA.
   3b. O₂ needed for SpO₂ >90% for 2 h or more since the delivery room → clinical illness.
4. Well baby, documented fever, suspected Triple I → serial assessment, no antibiotics.
5. Well baby, confirmed Triple I → antibiotics, with no re-check line.
6. Override flow: reason and staff name appear in the copied summary.
7. GA <35 → out-of-scope screen.
8. No network request after load (Playwright request log is empty). The page's own font files (same origin, no data sent) are fetched right after `load`, before the log starts at network idle; nothing else is.

Also in the suite: a double tap answers one question (9), the production CSP (10), the "none" and
"no value" locks (11), Back from a result (12), the call-staff screen (13), Kaiser not computed when
no maternal Tmax was recorded (14), and the copy-time stamp (15).

**Performance.** Built bundle ≤100 KB gzipped; first screen interactive in ≤2 s with 400 ms added
latency and 400 kbit/s down and up, emulated through the Chrome DevTools protocol. That is the
bandwidth of DevTools' "3G" preset (called "Slow 3G" until 2024) at its 400 ms target round trip;
DevTools itself adds 2 s of latency, so the test is lighter than that preset (source comment in
`tests/e2e/perf.spec.ts`).

**Clinical check before release.** Pp and one other neonatologist take 30 recent KCMH cases, enter them
by hand (nothing is saved), and compare the page's category and action with their own reading of the
CPG. Every disagreement is either a bug or a definition to change, decided by Pp.

## 7. Deliverables and release gate

Deliverables:
1. Repo `valhalla-health/eos-abx-gate` (public) with this SRS, a README, the code and tests.
2. Technical Design Document after the code exists (sequence diagram and per-module input/process/output
   table), checked against the code.
3. Code review report (category, severity, location, problem, fix, status) before release.
4. Worker live at `eos-abx-gate.valhalla-health.workers.dev`, and a QR code for the nursery and SCN.
5. Outside the repo, in `Desktop\PraewPP\EOS ABX Gate\Product\`: the NICU-meeting brief on the merged
   definitions and the monthly audit sheet.

Release gate (all required):
- Every unit and E2E test passes; the Kaiser fixture matches the site.
- Pp signs off the drafted thresholds in 4.1.
- The NICU team agrees the merged definitions; the footer shows the agreed date.
- Footer attribution to the Kaiser Permanente EOS calculator with a link, as Kaiser asks.

Monthly audit (D10), done by hand from charts: babies ≥35 wk started on antibiotics for suspected EOS,
how many have a pasted summary, how many starts match the page's action, override reasons.

## 8. Open items

- KCMH incidence (culture-proven EOS in inborn ≥35 wk ÷ live births, last 3–5 years) to replace 0.5.
- NICU team agreement on the merged definitions.
- An age question: the start screen says the page is for babies up to 72 hours old, but no screen
  asks the age. Pp may ask for one.
