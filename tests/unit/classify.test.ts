import { describe, expect, it } from 'vitest';
import type { Answers } from '../../src/data/types';
import { allowedEquivParams, classify, pendingEquivTimingKey } from '../../src/logic/classify';

const base: Answers = {
  gaWeeks: 38,
  resp: 'none',
  vasoOrBolus: false,
  seizure: false,
  apgar5Below5: false,
  apnea: false,
  poorFeeding: false,
  lethargy: false,
  equivParams: [],
};

describe('classify', () => {
  it('GA below 35 is out of scope', () => {
    expect(classify({ gaWeeks: 34 })).toEqual({ category: 'outOfScope', reason: 'gaBelow35', rechecks: [] });
  });

  // resp asks for the most support needed since leaving the delivery room (SRS D7).
  it('CPAP, HFNC or ventilator needed since the delivery room is clinical illness', () => {
    expect(classify({ ...base, resp: 'cpap' })).toEqual({ category: 'clinicalIllness', reason: 'cpap', rechecks: [] });
  });

  it("resp: 'none' (support only in the delivery room, or none) is not clinical illness", () => {
    expect(classify({ ...base, resp: 'none' }).category).toBe('well');
  });

  it('O2 needed for SpO2 >90% for 2 h or more in total since the delivery room is clinical illness', () => {
    expect(classify({ ...base, resp: 'o2', o2Needed: true, o2Ge2h: true }).reason).toBe('o2Ge2h');
  });

  it('O2 needed for under 2 h is not yet clinical illness and asks for a re-check', () => {
    const c = classify({ ...base, resp: 'o2', o2Needed: true, o2Ge2h: false });
    expect(c.category).toBe('well');
    // No sign ticked either, so the 2 h sign re-check follows the O2 one.
    expect(c.rechecks).toEqual(['o2At2h', 'signsAt2h']);
  });

  it('O2 given while SpO2 was already >90% does not count', () => {
    expect(classify({ ...base, resp: 'o2', o2Needed: false }).category).toBe('well');
  });

  it.each([
    ['vasoOrBolus', 'vasoOrBolus'],
    ['seizure', 'seizure'],
    ['apgar5Below5', 'apgar'],
    ['apnea', 'apnea'],
  ] as const)('%s is clinical illness', (key, reason) => {
    expect(classify({ ...base, [key]: true })).toEqual({ category: 'clinicalIllness', reason, rechecks: [] });
  });

  it('poor feeding counts only after a staff check', () => {
    expect(classify({ ...base, poorFeeding: true, poorFeedingStaffChecked: false }).category).toBe('well');
    expect(classify({ ...base, poorFeeding: true, poorFeedingStaffChecked: true }).reason).toBe('poorFeeding');
  });

  it('lethargy or irritability counts only after a staff check', () => {
    expect(classify({ ...base, lethargy: true, lethargyStaffChecked: false }).category).toBe('well');
    expect(classify({ ...base, lethargy: true, lethargyStaffChecked: true }).reason).toBe('lethargy');
  });

  // The signs screen lists only signs continuous for 2 h or more; intermittent time is not added
  // (Pp, 2026-10-29; SRS 4.1).
  it('one sign continuous for 4 h is equivocal', () => {
    expect(classify({ ...base, equivParams: ['rr'], oneParamGe4h: true })).toEqual({
      category: 'equivocal',
      reason: 'oneParam4h',
      rechecks: [],
    });
  });

  // The screen asks about the time since the delivery room, so a sign that lasted 4 h without a
  // break and has resolved is still ticked, and still counts.
  it('a sign that lasted 4 h continuously and has resolved is equivocal', () => {
    expect(classify({ ...base, equivParams: ['hr'], oneParamGe4h: true }).reason).toBe('oneParam4h');
  });

  it('one sign continuous for under 4 h is well with a 4 h re-check', () => {
    expect(classify({ ...base, equivParams: ['rr'], oneParamGe4h: false })).toEqual({
      category: 'well',
      reason: 'signsTooShort',
      rechecks: ['signsAt4h'],
    });
  });

  it('two signs continuous for 2 h are equivocal with no duration answer', () => {
    expect(classify({ ...base, equivParams: ['rr', 'resp'] })).toEqual({
      category: 'equivocal',
      reason: 'twoParams2h',
      rechecks: [],
    });
  });

  it('three or four signs are equivocal for the same reason', () => {
    expect(classify({ ...base, equivParams: ['hr', 'rr', 'temp'] }).reason).toBe('twoParams2h');
    expect(classify({ ...base, equivParams: ['hr', 'rr', 'temp', 'resp'] }).reason).toBe('twoParams2h');
  });

  it('no sign continuous for 2 h is well with a 2 h re-check', () => {
    expect(classify(base)).toEqual({ category: 'well', reason: 'noSigns', rechecks: ['signsAt2h'] });
  });

  it('two signs ticked on O2 under 2 h: equivocal, and the O2 re-check stays', () => {
    const a: Answers = { ...base, resp: 'o2', o2Needed: true, o2Ge2h: false, equivParams: ['hr', 'temp'] };
    expect(classify(a)).toEqual({ category: 'equivocal', reason: 'twoParams2h', rechecks: ['o2At2h'] });
  });

  it('respiratory distress does not count as a sign when O2 is needed; both re-checks follow', () => {
    const a: Answers = { ...base, resp: 'o2', o2Needed: true, o2Ge2h: false, equivParams: ['resp'] };
    expect(classify(a)).toEqual({ category: 'well', reason: 'noSigns', rechecks: ['o2At2h', 'signsAt2h'] });
  });

  it('respiratory distress counts when O2 was given but not needed', () => {
    const a: Answers = { ...base, resp: 'o2', o2Needed: false, equivParams: ['resp'], oneParamGe4h: true };
    expect(classify(a).category).toBe('equivocal');
  });

  it('respiratory distress on O2 is left out of the count, so RR alone is one sign', () => {
    const a: Answers = { ...base, resp: 'o2', o2Needed: true, o2Ge2h: false, equivParams: ['rr', 'resp'], oneParamGe4h: false };
    expect(classify(a)).toEqual({ category: 'well', reason: 'signsTooShort', rechecks: ['o2At2h', 'signsAt4h'] });
  });
});

describe('allowedEquivParams', () => {
  it('offers all four signs normally', () => {
    expect(allowedEquivParams(base)).toEqual(['hr', 'rr', 'temp', 'resp']);
  });
  it('drops respiratory distress when O2 is needed', () => {
    expect(allowedEquivParams({ ...base, resp: 'o2', o2Needed: true })).toEqual(['hr', 'rr', 'temp']);
  });
});

describe('pendingEquivTimingKey', () => {
  it('is null with no sign', () => {
    expect(pendingEquivTimingKey(base)).toBeNull();
  });
  it('one sign: asks the 4 h question until it is answered', () => {
    const a: Answers = { ...base, equivParams: ['rr'] };
    expect(pendingEquivTimingKey(a)).toBe('oneParamGe4h');
    expect(pendingEquivTimingKey({ ...a, oneParamGe4h: false })).toBeNull();
    expect(pendingEquivTimingKey({ ...a, oneParamGe4h: true })).toBeNull();
  });
  it('two or more signs: nothing to ask, the signs screen already asked for 2 h', () => {
    expect(pendingEquivTimingKey({ ...base, equivParams: ['rr', 'hr'] })).toBeNull();
    expect(pendingEquivTimingKey({ ...base, equivParams: ['hr', 'rr', 'temp', 'resp'] })).toBeNull();
  });
  it('respiratory distress does not count when O2 is needed', () => {
    const a: Answers = { ...base, resp: 'o2', o2Needed: true, o2Ge2h: false, equivParams: ['resp'] };
    expect(pendingEquivTimingKey(a)).toBeNull();
    expect(pendingEquivTimingKey({ ...a, equivParams: ['rr', 'resp'] })).toBe('oneParamGe4h');
  });
});
