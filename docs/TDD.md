# EOS ABX Gate: Technical Design Document

Version 0.1 · 2026-10-29 · Written from the code on `main` at commit `5b51d95` (after the final fix
wave); the screens section and the number rule updated for the result-screen redesign (Task 14), and the
sign screens for the continuous-time rule (Task 15) · The spec is
[`SRS.md`](SRS.md); where this page and the code disagree, the code is right and this page is out of date.

This page is for a reader who does not open the code. Part 1 follows one baby through the page, step
by step. Part 2 says what each logic and flow module takes in, does, and gives back.

## How the page is put together

The page is one HTML file, one script, one stylesheet and five font files. It runs entirely in the
browser: after it has loaded it sends nothing, stores nothing, and forgets every answer on reload or
on เริ่มใหม่.

| Folder | What it holds | Rule |
|---|---|---|
| `src/data/` | Kaiser 2024 coefficients and intercepts, the incidence (0.5/1000), every question and its Thai labels, the Thai screen text and the English note text | Numbers and words only, no decisions |
| `src/logic/` | Every clinical rule: category, Kaiser risk, CPG well branch, final action, note text | The only place a clinical number is compared |
| `src/flow/` | Which question comes next; the answers held in memory; back and restart | Asks `logic` instead of comparing numbers |
| `src/ui/` | Draws one screen at a time and turns taps into answers | Shows what `logic` decided |

Three behaviours sit in `src/ui/render.ts` and are not in the SRS. Each new screen ignores taps for
300 ms, so the second tap of a double tap cannot answer the next question. On a multi-select or
number screen, the "none" or "no value" button is disabled while a box is ticked or the number box
holds any text; when the 300 ms ends, the screen runs that rule again instead of enabling every
button. And a number box is a text field with a decimal keypad, so a mouse wheel or an arrow key
cannot change the value; `flow/numberAnswer.ts` accepts only a plain decimal inside the question's
range, so "0x26" or "1e2" shows the range error instead of being read as a number.

### The screens

`ui/render.ts` draws, `ui/styles.css` styles, and neither makes a clinical decision. The look follows
NeoFeed's design system (its `:root` tokens in `NeoFeed.html`): oklch colour tokens whose text tiers
were checked by WCAG ratio, white cards on a tinted page, 1.5px borders, one focus outline, light
only. The page is a warm near-white with a soft orange for the top stripe and the buttons. Severity
uses NeoFeed's own crit, warn and ok colours, so a red or green banner means what it means in NeoFeed;
the orange never marks severity. The ratios sit beside each token in `styles.css`.

- **Start.** Title, one sentence, the limits as two pills (GA 35 wk ขึ้นไป, อายุไม่เกิน 72 ชม.), a large
  เริ่ม button.
- **Questions.** The title is the question; a hint is one short line. A longer list sits behind a
  closed `<details>`: the broad-spectrum drugs on the maternal-antibiotic screen, one rule per line.
  Answers are white cards at least 52 px tall; a ticked box fills its card with pale orange.
- **Result.** Top to bottom: a banner whose headline is the screen's `h1` and says the decision in
  words (ให้ ABX, ยังไม่ให้ ABX, ไม่ให้ ABX, ปรึกษา staff, ใช้หน้านี้ไม่ได้) with one line of what to do; pills
  for the category and the Kaiser risk after exam; any re-check line in bold; the copy button; a closed
  `<details>` "ดูเหตุผลและข้อความ" holding the reason, the CPG path, the Kaiser model, incidence and both
  risks, and the note; the override as a small text button; back and restart. `logic/tone.ts` turns
  the action into the banner's tone; the screen only turns the tone into a class.
- **Copy.** The copy button writes the note to the clipboard without opening the `<details>`. When
  the browser refuses the clipboard, the page opens the `<details>` and selects the note for Ctrl+C.
- **Fonts.** IBM Plex Sans Thai (400, 600) and IBM Plex Mono (500) come from the `@fontsource` npm
  packages, and Vite bundles them into `dist/assets`, so they load from the page's own origin. The
  first screen draws in the phone's Thai font; `main.ts` switches to the web fonts after the load
  event and fetches all five files at once. A font fetched during loading holds the load event back,
  and on the 400 kbit/s test profile that moved the first screen from 1.2 s to 3.3 s. Fetching every
  face up front means no later screen makes a request. The OFL licence is `public/fonts/OFL.txt`.

## Part 1. Journey 2, step by step

Journey 2 is the second end-to-end test: a 40-week baby on room air with RR ≥60 and grunting, each
continuous for 2 h, mother GBS negative, no antibiotics, highest temperature 37.0 °C, ROM 10 h. Expected result: equivocal,
Kaiser 0.29/1000 at birth and 1.06/1000 after exam, CBC and blood culture, no antibiotics.

```mermaid
sequenceDiagram
    actor R as Resident
    participant UI as ui/render
    participant S as flow/session
    participant E as flow/engine
    participant C as logic/classify
    participant Rec as logic/recommend
    participant K as logic/kaiser
    participant D as data/kaiser2024
    participant Sum as logic/summary
    participant T as logic/tone

    R->>UI: tap เริ่ม
    UI->>S: step()
    S->>E: nextStep({})
    E-->>UI: ask gaWeeks
    R->>UI: tap 40 wk
    UI->>S: answer(gaWeeks, 40)
    UI->>S: step()
    S->>E: nextStep(answers)
    E->>C: classify: below 35? no
    E-->>UI: ask resp
    Note over R,E: The same loop for each tap: room air, then no to vasoactive/bolus, seizure,<br/>Apgar, apnea, poor feeding, lethargy. After each answer the engine asks<br/>classify whether a clinical-illness item is now yes (none is).
    R->>UI: tick RR 60 ขึ้นไป and grunting (each continuous for 2 h), tap ต่อไป
    UI->>S: answer(equivParams, [rr, resp])
    S->>E: nextStep(answers)
    E->>C: pendingEquivTimingKey: 2 signs, nothing to ask
    E->>C: classify: equivocal (2 signs continuous for 2 h)
    E-->>UI: ask gaDays, then tmaxC, romHours, gbs, matAbx
    R->>UI: +0 วัน, 37.0, 10, ลบ, ไม่ได้
    UI->>S: answer() once per screen
    S->>E: nextStep(answers)
    E-->>UI: result (no antibiotic, so no timing question)
    UI->>Rec: recommend(answers, 0.5)
    Rec->>C: classify: equivocal
    Rec->>K: cToF(37.0) = 98.6 °F; abxIndicators(none) = no credit
    Rec->>K: riskAtBirth(40+0 wk, 98.6 °F, 10 h, GBS neg)
    K->>D: coefficients; intercept for 0.5/1000 = 57.9
    K-->>Rec: 0.2909/1000 at birth
    Rec->>K: equivocalPosterior(0.2909)
    K->>D: equivocal likelihood ratio 3.65
    K-->>Rec: 1.0610/1000 after exam
    Rec->>K: band(1.0610): formatPer1000 gives "1.06", 1 to under 3
    K-->>Rec: cultureNoAbx
    Rec-->>UI: equivocal, twoParams2h, cultureNoAbx, Kaiser numbers
    UI->>T: actionTone(cultureNoAbx) = warn
    UI->>K: formatPer1000 for the Kaiser pill and rows
    UI->>Sum: summaryText(answers, result, now, 0.5)
    Sum->>C: effectiveParams: the signs ticked (RR, grunting)
    Sum->>K: cToF for the inputs line; formatPer1000 for the Kaiser line
    Sum-->>UI: the progress-note text
    UI-->>R: banner ยังไม่ให้ ABX, pills, copy button; reason, Kaiser rows and note behind ดูเหตุผลและข้อความ
    R->>UI: tap คัดลอกข้อความสรุป
    UI->>Sum: summaryText again, stamped with the time of the copy
```

The same journey in words:

1. **Each tap is one answer.** The screen hands the answer to `flow/session`, which stores it in
   memory and remembers the order. The screen then asks the session for the next step; the session
   asks `flow/engine`.
2. **The engine walks the SRS order** and returns the first question without an answer. It never
   compares a clinical number: to know whether to stop, it asks `logic/classify` after every answer
   (is the baby below 35 weeks? is any clinical-illness item now yes? which duration question is
   still open?). The respiratory and sign questions cover the whole time since the delivery room.
3. **Two signs.** The signs screen asks "ตั้งแต่ออกจากห้องคลอด มีข้อไหนเป็นต่อเนื่องนาน 2 ชม. ขึ้นไป", so a
   ticked sign has already lasted 2 h without a break. With RR ≥60 and grunting ticked, `classify` counts
   2 signs, which is equivocal with no duration question, and the engine turns to the Kaiser questions.
   One sign would bring one more screen, "ข้อนี้เป็นต่อเนื่องนานถึง 4 ชม. หรือยัง".
4. **Kaiser questions.** GA days, maternal highest temperature, ROM hours, GBS, maternal antibiotics.
   The mother had none, so there is no timing question, and the engine says the walk is done.
5. **The result.** `logic/recommend` asks `classify` for the category again (equivocal), converts
   37.0 °C to 98.6 °F, gives no antibiotic credit, and runs the Kaiser equation with the site's
   intercept for 0.5/1000 (57.9). Risk at birth is 0.2909/1000. Multiplying the odds by the equivocal
   likelihood ratio 3.65 gives 1.0610/1000.
6. **The action.** `band()` reads the risk at the 2 decimals the user sees ("1.06"), which falls in
   "1 to under 3": CBC, blood culture, VS every 4 h for 24 h, no antibiotics.
7. **The screen and the note.** The screen opens with an amber banner, "ยังไม่ให้ ABX" over "CBC + H/C ·
   VS ทุก 4 ชม. นาน 24 ชม." (`logic/tone` gives cultureNoAbx the warn tone), then the pills "Equivocal"
   and "Kaiser 1.06/1000". The reason, the Kaiser rows and the note wait under ดูเหตุผลและข้อความ.
   `logic/summary` writes the English note, which also repeats what was entered: "Signs continuous
   ≥2 h since delivery room: RR ≥60, grunting/flaring/retraction without O2" and "Kaiser inputs: GA 40+0 wk,
   Tmax 37.0 °C (98.60 °F), ROM 10 h, GBS neg, maternal abx none". Both print the Kaiser numbers
   through the same formatter (`formatPer1000`), so the screen, the note and the action always
   agree. Tapping Copy writes the note again, so its time stamp is the time of the copy.

## Part 2. Modules in `src/logic` and `src/flow`

| Module | Input | Process (plain language) | Output |
|---|---|---|---|
| `logic/classify.ts` | The answers so far | Below 35 weeks is out of scope. Otherwise it checks the clinical-illness items in SRS order, and the first yes wins: CPAP, HFNC or ventilator needed since leaving the delivery room; O₂ needed for SpO₂ >90% for 2 h or more in total since then; vasoactive drug or bolus; seizure; 5-minute Apgar <5; apnea; poor feeding or lethargy, each only after a staff check. If none is yes, it counts the equivocal signs, leaving out grunting, flaring or retraction when O₂ is needed for SpO₂. Every ticked sign was continuous for 2 h or more; intermittent time is not added. Two or more signs make the baby equivocal at once; one sign does when it was continuous for 4 h. One sign under 4 h, or no sign, makes the baby well-appearing. It adds a re-check note for O₂ under 2 h, for one sign under 4 h (run again at 4 h) and for no sign (run again if a sign lasts 2 h). | The category, one reason, and the re-check notes. Also, for the engine: whether the one-sign 4 h question is still open. For the screen: which signs may be offered. |
| `logic/kaiser.ts` | GA weeks and days, maternal highest temperature, ROM hours, GBS status, maternal antibiotic class and timing, incidence | Converts °C to °F as °C × 9/5 + 32 rounded to 2 decimals (the Kaiser site does not round, and the 2 decimals are exact for the one-decimal entries the page accepts). Turns antibiotic class and timing into Kaiser's two credit terms: penicillin, ampicillin or cefazolin given 2 h or more before delivery, or broad-spectrum 2 to 3.9 h, earns the first; broad-spectrum 4 h or more earns the second; anything else, or timing unknown, earns none. Runs the Kaiser 2024 equation with the site's intercept for the incidence (57.9 at 0.5/1000). Multiplies the odds by 3.65 for an equivocal baby. Rounds to 2 decimals, and reads the action band from that rounded number. | Risk at birth and after exam, per 1000; the 2-decimal text; the band: under 1 observe, 1 to under 3 culture without antibiotics, 3 or more culture with antibiotics. |
| `logic/cpgWell.ts` | Maternal fever answer, suspected and confirmed Triple I criteria, GBS IAP indications, whether IAP was adequate | Follows the KCMH CPG well-appearing flowchart. Fever ≥39.0 once, or 38.0 to 38.9 still high on a repeat, or not repeated, counts as documented fever. With fever: no suspected criterion is isolated fever; a suspected one is suspected Triple I; a suspected plus a confirmed one is confirmed Triple I. Without fever: no IAP indication is routine care; an indication with adequate IAP is routine care; inadequate or unknown IAP is serial assessment. A missing answer gives no leaf, so it cannot read as "no". | One of six CPG leaves, or none when an answer is missing; and the leaf's action: antibiotics (confirmed Triple I), serial assessment with VS for 48 to 72 h, or routine care. |
| `logic/recommend.ts` | All the answers, the incidence | Asks `classify` for the category. Out of scope: the out-of-scope action (clinical judgement, discuss with staff). Clinical illness: antibiotics. Equivocal: runs Kaiser, but stops with "Kaiser not computed, discuss with staff" when GA, temperature, ROM, GBS or maternal antibiotics is missing, or when the risk comes out not a finite number. Unknown GA days take the higher of the +0 and +6 day risk. Well-appearing: asks `cpgWell`, but returns "answers incomplete, discuss with staff" when a sign, a duration or a CPG answer is missing (the page never asks that early). | The result: category, reason, re-checks, action, the Kaiser numbers when computed, the CPG leaf when well. |
| `logic/summary.ts` | The answers, the result, the time, the incidence | Writes the progress-note lines in the SRS section 5 order: version and time; GA and category with its reason; the signs ticked, each continuous for 2 h or more, and for one sign whether it reached 4 h (equivocal and well-appearing paths); the Kaiser inputs, when Kaiser ran, with the unknown-GA-days rule when it applied; Kaiser numbers; CPG path; action; re-checks; override with the staff name; definitions status. | Plain English text with no patient identifier. |
| `logic/tone.ts` | The action | Groups the actions by what they mean for the baby: antibiotics now (clinical illness, confirmed Triple I, Kaiser 3 or more) is crit; culture with antibiotics held (Kaiser 1 to under 3) is warn; no antibiotics (Kaiser under 1, serial assessment, routine care) is ok; no recommendation (Kaiser not computed, below 35 weeks, answers incomplete) is neutral. | The banner tone, which the screen turns into a colour class. |
| `flow/engine.ts` | The answers so far | Returns the first question still unanswered, in the SRS order. After the signs it asks the 4 h question only when exactly one sign is ticked. It ends the walk early below 35 weeks, as soon as `classify` says the baby has clinical illness (it asks after every answer, so a disagreement asks more questions instead of stopping early), and when the maternal temperature or ROM is unknown. When poor feeding or lethargy is yes but staff has not seen the baby, it shows the "ให้ staff มาดูเด็กก่อน ข้อนี้นับได้เมื่อ staff ดูเองแล้วเห็นด้วย" screen instead. It asks for antibiotic timing only after penicillin, ampicillin, cefazolin or broad-spectrum antibiotics. | The next step: a question, the call-staff screen, or the result. |
| `flow/session.ts` | Each answer from the screen; back, restart and override | Keeps the answers in memory only. Remembers the order they were given in, so back removes exactly the last one (and any override); answering a question again does not count twice. Restart clears everything. | The current answers, and the next step (from the engine). |
| `flow/numberAnswer.ts` | The text typed in a number box, the question's minimum and maximum | Trims the text and accepts only digits with an optional decimal part, or a point and digits (".5", a 30-minute ROM); so not "0x26", "1e2", "38.", "." or "-38". Then checks the range, both ends included. Input validation, not a clinical rule. | The number, or nothing, which the screen shows as the range error. |
