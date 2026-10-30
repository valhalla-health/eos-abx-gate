import { describe, expect, it } from 'vitest';
import type { Answers } from '../../src/data/types';
import { nextStep } from '../../src/flow/engine';

const ask = (key: string) => ({ kind: 'question', key });
const RESULT = { kind: 'result' };
const noIllness: Answers = {
  gaWeeks: 38,
  resp: 'none',
  vasoOrBolus: false,
  seizure: false,
  apgar5Below5: false,
  apnea: false,
  poorFeeding: false,
  lethargy: false,
};

describe('nextStep', () => {
  it('starts with GA', () => expect(nextStep({})).toEqual(ask('gaWeeks')));
  it('ends at once below 35 weeks', () => expect(nextStep({ gaWeeks: 34 })).toEqual(RESULT));
  it('asks respiratory support next', () => expect(nextStep({ gaWeeks: 38 })).toEqual(ask('resp')));

  it('CPAP, HFNC or ventilator needed since the delivery room ends the walk one tap after GA', () => {
    expect(nextStep({ gaWeeks: 38, resp: 'cpap' })).toEqual(RESULT);
  });

  it('O2 path: need, then total time since the delivery room', () => {
    expect(nextStep({ gaWeeks: 38, resp: 'o2' })).toEqual(ask('o2Needed'));
    expect(nextStep({ gaWeeks: 38, resp: 'o2', o2Needed: false })).toEqual(ask('vasoOrBolus'));
    expect(nextStep({ gaWeeks: 38, resp: 'o2', o2Needed: true })).toEqual(ask('o2Ge2h'));
  });

  it('O2 needed for 2 h or more since the delivery room ends the walk', () => {
    expect(nextStep({ gaWeeks: 38, resp: 'o2', o2Needed: true, o2Ge2h: true })).toEqual(RESULT);
  });

  it('O2 needed for under 2 h goes on to the other clinical-illness items', () => {
    expect(nextStep({ gaWeeks: 38, resp: 'o2', o2Needed: true, o2Ge2h: false })).toEqual(ask('vasoOrBolus'));
  });

  it('stops at the first yes among the yes/no items', () => {
    expect(nextStep({ gaWeeks: 38, resp: 'none', vasoOrBolus: false, seizure: true })).toEqual(RESULT);
  });

  it('poor feeding: asks for the staff check, and waits for staff when not yet done', () => {
    const a: Answers = { ...noIllness, poorFeeding: true };
    expect(nextStep(a)).toEqual(ask('poorFeedingStaffChecked'));
    expect(nextStep({ ...a, poorFeedingStaffChecked: false })).toEqual({ kind: 'needStaff' });
    expect(nextStep({ ...a, poorFeedingStaffChecked: true })).toEqual(RESULT);
  });

  it('lethargy: same staff check', () => {
    const a: Answers = { ...noIllness, lethargy: true };
    expect(nextStep(a)).toEqual(ask('lethargyStaffChecked'));
    expect(nextStep({ ...a, lethargyStaffChecked: false })).toEqual({ kind: 'needStaff' });
  });

  it('asks the equivocal signs after the clinical-illness items', () => {
    expect(nextStep(noIllness)).toEqual(ask('equivParams'));
  });

  it('one sign asks about 4 h continuous; reached goes to Kaiser, not reached to the well branch', () => {
    const a: Answers = { ...noIllness, equivParams: ['rr'] };
    expect(nextStep(a)).toEqual(ask('oneParamGe4h'));
    expect(nextStep({ ...a, oneParamGe4h: true })).toEqual(ask('gaDays'));
    expect(nextStep({ ...a, oneParamGe4h: false })).toEqual(ask('fever'));
  });

  it('a sign present at assessment and continuous for 4 h makes the baby equivocal and goes to Kaiser', () => {
    expect(nextStep({ ...noIllness, equivParams: ['temp'], oneParamGe4h: true })).toEqual(ask('gaDays'));
  });

  it('two or more signs go straight to Kaiser with no duration question', () => {
    expect(nextStep({ ...noIllness, equivParams: ['rr', 'hr'] })).toEqual(ask('gaDays'));
    expect(nextStep({ ...noIllness, equivParams: ['hr', 'rr', 'temp', 'resp'] })).toEqual(ask('gaDays'));
  });

  it('no sign goes straight to the well branch with no duration question', () => {
    expect(nextStep({ ...noIllness, equivParams: [] })).toEqual(ask('fever'));
  });

  it('respiratory distress alone does not count when O2 is needed, so the well branch follows', () => {
    const a: Answers = { ...noIllness, resp: 'o2', o2Needed: true, o2Ge2h: false, equivParams: ['resp'] };
    expect(nextStep(a)).toEqual(ask('fever'));
  });

  it('Kaiser questions in order, timing only when an antibiotic counts', () => {
    const k: Answers = { ...noIllness, equivParams: ['rr'], oneParamGe4h: true };
    expect(nextStep({ ...k, gaDays: 0 })).toEqual(ask('tmaxC'));
    expect(nextStep({ ...k, gaDays: 0, tmaxC: null })).toEqual(RESULT);
    expect(nextStep({ ...k, gaDays: 0, tmaxC: 37 })).toEqual(ask('romHours'));
    expect(nextStep({ ...k, gaDays: 0, tmaxC: 37, romHours: null })).toEqual(RESULT);
    const full: Answers = { ...k, gaDays: 0, tmaxC: 37, romHours: 10 };
    expect(nextStep(full)).toEqual(ask('gbs'));
    expect(nextStep({ ...full, gbs: 'neg' })).toEqual(ask('matAbx'));
    expect(nextStep({ ...full, gbs: 'neg', matAbx: 'none' })).toEqual(RESULT);
    expect(nextStep({ ...full, gbs: 'neg', matAbx: 'notCounted' })).toEqual(RESULT);
    expect(nextStep({ ...full, gbs: 'neg', matAbx: 'broad' })).toEqual(ask('abxTiming'));
    expect(nextStep({ ...full, gbs: 'neg', matAbx: 'broad', abxTiming: 'ge4' })).toEqual(RESULT);
    expect(nextStep({ ...full, gbs: 'neg', matAbx: 'gbsSpecific' })).toEqual(ask('abxTiming'));
    expect(nextStep({ ...full, gbs: 'neg', matAbx: 'gbsSpecific', abxTiming: 'lt2' })).toEqual(RESULT);
  });

  it('fever not repeated counts as documented fever and asks Triple I; a lower repeat goes to GBS IAP', () => {
    const w: Answers = { ...noIllness, equivParams: [] };
    expect(nextStep({ ...w, fever: 'notRepeated' })).toEqual(ask('suspected'));
    expect(nextStep({ ...w, fever: 'repeatLower' })).toEqual(ask('iapIndications'));
  });

  it('well branch: fever, then Triple I criteria', () => {
    const w: Answers = { ...noIllness, equivParams: [] };
    expect(nextStep(w)).toEqual(ask('fever'));
    expect(nextStep({ ...w, fever: 'ge39' })).toEqual(ask('suspected'));
    expect(nextStep({ ...w, fever: 'ge39', suspected: [] })).toEqual(RESULT);
    expect(nextStep({ ...w, fever: 'ge39', suspected: ['matWbc'] })).toEqual(ask('confirmed'));
    expect(nextStep({ ...w, fever: 'ge39', suspected: ['matWbc'], confirmed: [] })).toEqual(RESULT);
  });

  it('well branch: no fever, then GBS IAP', () => {
    const w: Answers = { ...noIllness, equivParams: [], fever: 'none' };
    expect(nextStep(w)).toEqual(ask('iapIndications'));
    expect(nextStep({ ...w, iapIndications: [] })).toEqual(RESULT);
    expect(nextStep({ ...w, iapIndications: ['gbsPos'] })).toEqual(ask('adequateIap'));
    expect(nextStep({ ...w, iapIndications: ['gbsPos'], adequateIap: null })).toEqual(RESULT);
  });
});
