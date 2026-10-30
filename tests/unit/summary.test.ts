import { describe, expect, it } from 'vitest';
import { RESULT_TH, SUMMARY } from '../../src/data/text';
import type { Action, Answers, Result, WellPath } from '../../src/data/types';
import { band, formatPer1000 } from '../../src/logic/kaiser';
import { recommend } from '../../src/logic/recommend';
import { summaryText } from '../../src/logic/summary';

const now = new Date(2026, 9, 29, 14, 32);
const noIllness: Answers = {
  gaWeeks: 40,
  resp: 'none',
  vasoOrBolus: false,
  seizure: false,
  apgar5Below5: false,
  apnea: false,
  poorFeeding: false,
  lethargy: false,
};

describe('summaryText', () => {
  it('equivocal with Kaiser numbers (site case c01)', () => {
    const a: Answers = {
      ...noIllness,
      equivParams: ['rr', 'resp'],
      gaDays: 0,
      tmaxC: 37.0,
      romHours: 10,
      gbs: 'neg',
      matAbx: 'none',
    };
    expect(summaryText(a, recommend(a, 0.5), now, 0.5)).toBe(
      [
        'EOS ABX Gate v0.1.0 | 2026-10-29 14:32',
        'GA 40+0 wk | Category: Equivocal (two or more signs continuous for 2 h or more)',
        'Signs present at assessment, continuous ≥2 h: RR ≥60, grunting/flaring/retraction without O2',
        'Kaiser inputs: GA 40+0 wk, Tmax 37.0 °C (98.60 °F), ROM 10 h, GBS neg, maternal abx none',
        'Kaiser 2024, incidence 0.5/1000: at birth 0.29/1000, after exam 1.06/1000',
        'Action (KCMH CPG): CBC + blood culture, VS q4h x 24 h, NO antibiotics',
        'Override: none',
        'Definitions: draft 2026-10-29, not yet agreed by NICU team',
      ].join('\n'),
    );
  });

  it('clinical illness with an override and unknown GA days', () => {
    const a: Answers = {
      gaWeeks: 38,
      resp: 'cpap',
      override: { reason: 'staffOrder', otherText: '', staff: 'อ.ทดสอบ' },
    };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('GA 38 wk | Category: Clinical illness (CPAP/HFNC/ventilator needed outside the delivery room)');
    expect(text).toContain('Action (KCMH CPG): admit Sick NB unit, CBC + blood culture, empiric antibiotics');
    expect(text).toContain('Override: staff decision | agreed by อ.ทดสอบ');
    // Signs are not asked on the clinical-illness path, and Kaiser did not run.
    expect(text).not.toContain('Signs present');
    expect(text).not.toContain('Kaiser inputs');
  });

  it('unknown GA days: the Kaiser inputs line says which risk was used', () => {
    const a: Answers = {
      ...noIllness,
      equivParams: ['rr'],
      oneParamGe4h: true,
      gaDays: null,
      tmaxC: 37,
      romHours: 10,
      gbs: 'neg',
      matAbx: 'none',
    };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('GA 40+? wk | Category: Equivocal (one sign continuous for 4 h or more)');
    // One sign: the note also says whether it reached 4 h.
    expect(text).toContain('Signs present at assessment, continuous ≥2 h: RR ≥60 (reached 4 h)');
    expect(text).toContain(
      'Kaiser inputs: GA 40+? wk (days unknown: risk is the higher of +0 and +6 d), Tmax 37.0 °C (98.60 °F), ROM 10 h, GBS neg, maternal abx none',
    );
  });

  it('the Kaiser inputs line carries the antibiotic class, its timing, GBS and the °F value used', () => {
    const a: Answers = {
      ...noIllness,
      gaWeeks: 35,
      equivParams: ['hr', 'temp'],
      gaDays: 4,
      tmaxC: 39.1,
      romHours: 30.5,
      gbs: 'pos',
      matAbx: 'broad',
      abxTiming: 'ge4',
    };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    // Two or more signs: no 4 h mark, since the 4 h question is not asked.
    expect(text).toContain('Signs present at assessment, continuous ≥2 h: HR ≥160, T ≥38.0 or <36.5 °C\n');
    expect(text).toContain(
      'Kaiser inputs: GA 35+4 wk, Tmax 39.1 °C (102.38 °F), ROM 30.5 h, GBS pos, maternal abx broad-spectrum, ≥4 h before delivery',
    );
  });

  it('a well baby with no sign prints "none" for the signs and gets the 2 h re-check', () => {
    const a: Answers = { ...noIllness, equivParams: [], fever: 'none', iapIndications: [] };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('Signs present at assessment, continuous ≥2 h: none\n');
    expect(text).toContain('Category: Well-appearing (no sign meeting clinical-illness or equivocal criteria)');
    expect(text).toContain('Re-check: run again if any sign lasts 2 h continuously');
  });

  it('below 35 weeks prints <35 wk and the out-of-scope action', () => {
    const a: Answers = { gaWeeks: 34 };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('GA <35 wk | Category: Out of scope (GA below 35 wk)');
    expect(text).not.toContain('Signs present');
    expect(text).toContain('Action (KCMH CPG): not covered (GA <35 wk); clinical judgement, discuss with staff');
  });

  it('an "other" override prints the typed reason', () => {
    const a: Answers = { gaWeeks: 34, override: { reason: 'other', otherText: 'แม่ GBS bacteremia', staff: 'อ.ทดสอบ' } };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('Override: แม่ GBS bacteremia | agreed by อ.ทดสอบ');
  });

  it('well-appearing shows the CPG path and the re-check', () => {
    const a: Answers = { ...noIllness, equivParams: ['resp'], oneParamGe4h: false, fever: 'none', iapIndications: [] };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('Category: Well-appearing (one sign, continuous for less than 4 h)');
    expect(text).toContain('Signs present at assessment, continuous ≥2 h: grunting/flaring/retraction without O2 (not yet 4 h)');
    expect(text).toContain('CPG path: no fever, no GBS IAP indication');
    expect(text).toContain('Action (KCMH CPG): routine care');
    expect(text).toContain('Re-check: run again if the sign lasts 4 h continuously');
  });

  it('unknown GA days print as +?', () => {
    const a: Answers = { ...noIllness, equivParams: ['rr'], oneParamGe4h: true, gaDays: null, tmaxC: null };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('GA 40+? wk');
    // Kaiser was not computed (no maternal Tmax), so there is no Kaiser line and the action says so.
    expect(text).not.toContain('Kaiser 2024');
    expect(text).not.toContain('Kaiser inputs');
    expect(text).toContain(
      'Action (KCMH CPG): Kaiser not computed (maternal Tmax or ROM missing); discuss with staff',
    );
  });

  it('the screen line and the note show the same 2 decimals at x.xx5', () => {
    const r: Result = {
      classification: { category: 'equivocal', reason: 'oneParam4h', rechecks: [] },
      action: band(2.995),
      kaiser: { atBirth: 0.995, afterExam: 2.995 },
    };
    expect(summaryText({ gaWeeks: 40, gaDays: 0 }, r, now, 0.5)).toContain('at birth 1.00/1000, after exam 3.00/1000');
    // The screen prints both risks through formatPer1000 too (ui/render.ts per1000).
    expect([formatPer1000(0.995), formatPer1000(2.995)]).toEqual(['1.00', '3.00']);
    expect(r.action).toBe('cultureAbx');
  });

  it('a well baby on O2 under 2 h has no sign that meets the criteria, and gets the re-check', () => {
    const a: Answers = {
      ...noIllness,
      gaWeeks: 38,
      resp: 'o2',
      o2Needed: true,
      o2Ge2h: false,
      equivParams: [],
      fever: 'none',
      iapIndications: [],
    };
    const text = summaryText(a, recommend(a, 0.5), now, 0.5);
    expect(text).toContain('Category: Well-appearing (no sign meeting clinical-illness or equivocal criteria)');
    expect(text).toContain(
      ['Re-check: run again if O2 is still needed at 2 h', 'Re-check: run again if any sign lasts 2 h continuously'].join('\n'),
    );
  });
});

// Pp's wording for the equivocal-sign rule (2026-10-29): only continuous time counts.
describe('equivocal-sign text', () => {
  it('pins the Thai reasons and re-checks', () => {
    expect(RESULT_TH.reason.oneParam4h).toBe('ผิดปกติ 1 ข้อ ต่อเนื่อง 4 ชม. ขึ้นไป');
    expect(RESULT_TH.reason.twoParams2h).toBe('ผิดปกติ 2 ข้อขึ้นไป ต่อเนื่อง 2 ชม. ขึ้นไป');
    expect(RESULT_TH.reason.signsTooShort).toBe('มีอาการ 1 ข้อ แต่ต่อเนื่องยังไม่ถึง 4 ชม.');
    expect(RESULT_TH.reason.noSigns).toBe('ไม่มีอาการที่เข้าเกณฑ์ clinical illness หรือ equivocal');
    expect(RESULT_TH.recheck.signsAt2h).toBe('ถ้ามีอาการผิดปกติต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่');
    expect(RESULT_TH.recheck.signsAt4h).toBe(
      'ถ้าอาการนี้ต่อเนื่องครบ 4 ชม. หรือมีอาการอีกข้อต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่',
    );
  });
  it('pins the English reasons and re-checks', () => {
    expect(SUMMARY.reason.oneParam4h).toBe('one sign continuous for 4 h or more');
    expect(SUMMARY.reason.twoParams2h).toBe('two or more signs continuous for 2 h or more');
    expect(SUMMARY.reason.signsTooShort).toBe('one sign, continuous for less than 4 h');
    expect(SUMMARY.recheck.signsAt2h).toBe('run again if any sign lasts 2 h continuously');
    expect(SUMMARY.recheck.signsAt4h).toBe(
      'run again if the sign lasts 4 h continuously or a second sign lasts 2 h continuously',
    );
  });
  it('the reason for one of several signs at 4 h is gone', () => {
    expect(Object.keys(SUMMARY.reason)).not.toContain('manyParamsOne4h');
    expect(Object.keys(RESULT_TH.reason)).not.toContain('manyParamsOne4h');
  });
});

// Every Action key: the English note text and the Thai headline are pinned exactly; the Thai line
// under the headline must carry the key clinical words.
const ACTION_TEXT: Record<Action, { en: string; headline: string; th: string[] }> = {
  outOfScope: {
    en: 'not covered (GA <35 wk); clinical judgement, discuss with staff',
    headline: 'ใช้หน้านี้ไม่ได้',
    th: ['GA ต่ำกว่า 35 wk', 'ปรึกษา staff'],
  },
  abx: {
    en: 'admit Sick NB unit, CBC + blood culture, empiric antibiotics',
    headline: 'ให้ ABX',
    th: ['Admit Sick NB', 'CBC + H/C', 'empiric ABX'],
  },
  observe: {
    en: 'serial PE with VS, NO lab, NO antibiotics',
    headline: 'ไม่ให้ ABX',
    th: ['Serial PE', 'ไม่ต้องส่ง lab'],
  },
  cultureNoAbx: {
    en: 'CBC + blood culture, VS q4h x 24 h, NO antibiotics',
    headline: 'ยังไม่ให้ ABX',
    th: ['CBC + H/C', 'ทุก 4 ชม. นาน 24 ชม.'],
  },
  cultureAbx: {
    en: 'CBC + blood culture, empiric antibiotics',
    headline: 'ให้ ABX',
    th: ['CBC + H/C', 'empiric ABX'],
  },
  kaiserUnavailable: {
    en: 'Kaiser not computed (maternal Tmax or ROM missing); discuss with staff',
    headline: 'ปรึกษา staff',
    th: ['Kaiser'],
  },
  incomplete: {
    en: 'answers incomplete, no action computed; discuss with staff',
    headline: 'ปรึกษา staff',
    th: ['ยังตอบไม่ครบ'],
  },
  serial48to72: {
    en: 'serial assessment with VS for 48-72 h, NO lab, NO antibiotics',
    headline: 'ไม่ให้ ABX',
    th: ['Serial assessment', '48–72'],
  },
  routine: {
    en: 'routine care',
    headline: 'ไม่ให้ ABX',
    th: ['ตามปกติ'],
  },
};

describe('well-appearing CPG path text', () => {
  const PATHS: WellPath[] = ['confirmedTripleI', 'suspectedTripleI', 'isolatedFever', 'noIapIndication', 'adequateIap', 'inadequateIap'];
  it('every WellPath has an English note string and a Thai string', () => {
    expect(Object.keys(SUMMARY.wellPath).sort()).toEqual([...PATHS].sort());
    expect(Object.keys(RESULT_TH.wellPath).sort()).toEqual([...PATHS].sort());
    for (const p of PATHS) {
      expect(SUMMARY.wellPath[p].length).toBeGreaterThan(0);
      expect(RESULT_TH.wellPath[p].length).toBeGreaterThan(0);
    }
  });
  it('the Thai confirmed Triple I line names the criterion', () => {
    expect(RESULT_TH.wellPath.confirmedTripleI).toBe('แม่มีไข้ และเข้าเกณฑ์ confirmed Triple I');
  });
});

describe('action text', () => {
  it('the table covers exactly the Action keys in the text maps', () => {
    const keys = Object.keys(ACTION_TEXT).sort();
    expect(Object.keys(SUMMARY.action).sort()).toEqual(keys);
    expect(Object.keys(RESULT_TH.action).sort()).toEqual(keys);
  });

  it.each(Object.entries(ACTION_TEXT) as [Action, { en: string; headline: string; th: string[] }][])(
    '%s: English note text and Thai headline are pinned, and the Thai line keeps its clinical words',
    (key, { en, headline, th }) => {
      expect(SUMMARY.action[key]).toBe(en);
      expect(RESULT_TH.action[key].headline).toBe(headline);
      for (const word of th) expect(RESULT_TH.action[key].line).toContain(word);
    },
  );
});
