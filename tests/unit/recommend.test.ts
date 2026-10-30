import { describe, expect, it } from 'vitest';
import type { Answers } from '../../src/data/types';
import { riskAtBirth } from '../../src/logic/kaiser';
import { recommend } from '../../src/logic/recommend';

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
// Two signs ticked are two signs continuous for 2 h or more: equivocal with no duration answer.
const equivocal: Answers = { ...noIllness, equivParams: ['rr', 'resp'] };
// Site case c01: 40+0, 98.6 °F (37.0 °C), ROM 10 h, GBS negative, no antibiotics.
const c01: Answers = { ...equivocal, gaDays: 0, tmaxC: 37.0, romHours: 10, gbs: 'neg', matAbx: 'none' };

describe('recommend', () => {
  it('out of scope below 35 weeks', () => {
    expect(recommend({ gaWeeks: 34 }, 0.5).action).toBe('outOfScope');
  });

  it('clinical illness means antibiotics', () => {
    expect(recommend({ ...noIllness, resp: 'cpap' }, 0.5).action).toBe('abx');
  });

  it('equivocal runs Kaiser and matches the official site for c01', () => {
    const r = recommend(c01, 0.5);
    expect(r.kaiser?.atBirth).toBeCloseTo(0.29, 2);
    expect(r.kaiser?.afterExam).toBeCloseTo(1.06, 2);
    expect(r.action).toBe('cultureNoAbx');
  });

  it('equivocal without maternal Tmax cannot run Kaiser', () => {
    const r = recommend({ ...c01, tmaxC: null }, 0.5);
    expect(r.action).toBe('kaiserUnavailable');
    expect(r.kaiser).toBeUndefined();
  });

  it('equivocal without ROM hours cannot run Kaiser', () => {
    const r = recommend({ ...c01, romHours: null }, 0.5);
    expect(r.action).toBe('kaiserUnavailable');
    expect(r.kaiser).toBeUndefined();
  });

  it.each([
    ['maternal GBS', 'gbs'],
    ['maternal antibiotics', 'matAbx'],
  ] as const)('equivocal with %s not answered cannot run Kaiser', (_name, key) => {
    const a: Answers = { ...c01 };
    delete a[key];
    const r = recommend(a, 0.5);
    expect(r.action).toBe('kaiserUnavailable');
    expect(r.kaiser).toBeUndefined();
  });

  it.each([
    ['ROM hours below zero', { romHours: -1 }],
    ['maternal Tmax is NaN', { tmaxC: Number.NaN }],
    ['GA days are NaN', { gaDays: Number.NaN }],
    ['maternal Tmax overflows the model (risk 1000, posterior NaN)', { tmaxC: 1e6 }],
  ] as const)('non-finite Kaiser risk fails closed: %s', (_name, patch) => {
    const r = recommend({ ...c01, ...patch }, 0.5);
    expect(r.action).toBe('kaiserUnavailable');
    expect(r.kaiser).toBeUndefined();
  });

  describe('unknown GA days take the higher of the 0-day and 6-day risk', () => {
    const riskAt = (gaWeeks: number, gaDays: number) =>
      riskAtBirth({ gaWeeks, gaDays, tempF: 98.6, romHours: 10, gbs: 'neg', abx1: false, abx2: false }, 0.5);

    it('at 38 weeks the 0-day risk is higher', () => {
      const r = recommend({ ...c01, gaWeeks: 38, gaDays: null }, 0.5);
      expect(riskAt(38, 0)).toBeGreaterThan(riskAt(38, 6));
      expect(r.kaiser?.atBirth).toBeCloseTo(riskAt(38, 0), 10);
    });

    it('at 40 weeks the 6-day risk is higher', () => {
      const r = recommend({ ...c01, gaWeeks: 40, gaDays: null }, 0.5);
      expect(riskAt(40, 6)).toBeGreaterThan(riskAt(40, 0));
      expect(r.kaiser?.atBirth).toBeCloseTo(riskAt(40, 6), 10);
    });
  });

  it('unknown antibiotic timing earns no credit', () => {
    const unknown = recommend({ ...c01, matAbx: 'broad', abxTiming: 'unknown' }, 0.5);
    const none = recommend(c01, 0.5);
    expect(unknown.kaiser?.atBirth).toBeCloseTo(none.kaiser?.atBirth ?? -1, 10);
  });

  it('clindamycin or vancomycin alone earns no credit', () => {
    const clinda = recommend({ ...c01, matAbx: 'notCounted' }, 0.5);
    expect(clinda.kaiser?.atBirth).toBeCloseTo(recommend(c01, 0.5).kaiser?.atBirth ?? -1, 10);
  });

  // recommend() is only called by the result screen after the engine has every answer, so these
  // cannot happen in the page; they guard a future caller. classify() would read the missing answer
  // as "no" and the well branch would give routine care.
  describe('a well-appearing result with an answer missing fails closed', () => {
    const well: Answers = { ...noIllness, equivParams: [], fever: 'none', iapIndications: [] };
    it('complete answers give routine care (control)', () => {
      expect(recommend(well, 0.5).action).toBe('routine');
    });
    it.each([
      ['signs not answered', { equivParams: undefined }],
      ['one sign, its 4 h question not answered', { equivParams: ['rr'] }],
      ['maternal fever not answered', { fever: undefined }],
      ['GBS IAP indications not answered', { iapIndications: undefined }],
      ['IAP adequacy not answered', { iapIndications: ['gbsPos'] }],
      ['documented fever, Triple I criteria not answered', { fever: 'ge39', iapIndications: undefined }],
    ] as [string, Partial<Answers>][])('%s', (_name, patch) => {
      const r = recommend({ ...well, ...patch }, 0.5);
      expect(r.classification.category).toBe('well');
      expect(r.action).toBe('incomplete');
      expect(r.wellPath).toBeUndefined();
    });
  });

  it('well-appearing follows the CPG branch', () => {
    const r = recommend({ ...noIllness, equivParams: [], fever: 'ge39', suspected: ['purulent'], confirmed: [] }, 0.5);
    expect(r.wellPath).toBe('suspectedTripleI');
    expect(r.action).toBe('serial48to72');
  });

  // Confirmed Triple I already gives Admit Sick NB and ABX, so running the page again changes
  // nothing (Pp, 2026-10-30).
  it('confirmed Triple I drops every re-check', () => {
    const a: Answers = { ...noIllness, resp: 'o2', o2Needed: true, o2Ge2h: false, equivParams: ['rr'], oneParamGe4h: false };
    const r = recommend({ ...a, fever: 'ge39', suspected: ['purulent'], confirmed: ['placenta'] }, 0.5);
    expect(r.action).toBe('abx');
    expect(r.classification.rechecks).toEqual([]);
  });

  it('a well baby without antibiotics keeps its re-checks', () => {
    const r = recommend({ ...noIllness, equivParams: ['rr'], oneParamGe4h: false, fever: 'none', iapIndications: [] }, 0.5);
    expect(r.action).toBe('routine');
    expect(r.classification.rechecks).toEqual(['signsAt4h']);
  });
});
