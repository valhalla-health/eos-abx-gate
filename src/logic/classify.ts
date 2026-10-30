import type { Answers, Classification, EquivParam, ReasonCode, Recheck } from '../data/types';

const ALL_PARAMS: EquivParam[] = ['hr', 'rr', 'temp', 'resp'];

const o2Counts = (a: Answers) => a.resp === 'o2' && a.o2Needed === true;

// Respiratory distress is an equivocal sign only when the baby does not need O2 (SRS 4.1).
export function allowedEquivParams(a: Answers): EquivParam[] {
  return o2Counts(a) ? ALL_PARAMS.filter((p) => p !== 'resp') : [...ALL_PARAMS];
}

export function effectiveParams(a: Answers): EquivParam[] {
  const allowed = new Set(allowedEquivParams(a));
  return (a.equivParams ?? []).filter((p) => allowed.has(p));
}

export function clinicalIllnessReason(a: Answers): ReasonCode | null {
  // resp is the most support needed since leaving the delivery room, so CPAP here was needed at SCN
  // or NICU (SRS D7); support used only in the delivery room is outside the question.
  if (a.resp === 'cpap') return 'cpap';
  if (o2Counts(a) && a.o2Ge2h === true) return 'o2Ge2h';
  if (a.vasoOrBolus === true) return 'vasoOrBolus';
  if (a.seizure === true) return 'seizure';
  if (a.apgar5Below5 === true) return 'apgar';
  if (a.apnea === true) return 'apnea';
  if (a.poorFeeding === true && a.poorFeedingStaffChecked === true) return 'poorFeeding';
  if (a.lethargy === true && a.lethargyStaffChecked === true) return 'lethargy';
  return null;
}

// The duration question the equivocal rule still needs answered, or null (SRS 4.1). Only one sign
// needs one: every ticked sign was continuous for 2 h, so two or more are equivocal already.
// Sits beside classify() so both read the same sign-count rule.
export function pendingEquivTimingKey(a: Answers): 'oneParamGe4h' | null {
  return effectiveParams(a).length === 1 && a.oneParamGe4h === undefined ? 'oneParamGe4h' : null;
}

export function classify(a: Answers): Classification {
  if (a.gaWeeks !== undefined && a.gaWeeks < 35) {
    return { category: 'outOfScope', reason: 'gaBelow35', rechecks: [] };
  }
  const illness = clinicalIllnessReason(a);
  if (illness) return { category: 'clinicalIllness', reason: illness, rechecks: [] };

  const rechecks: Recheck[] = [];
  if (o2Counts(a) && a.o2Ge2h === false) rechecks.push('o2At2h');

  // Every ticked sign is present at assessment and was continuous for 2 h or more; intermittent time
  // is not added (Pp, 2026-10-29 and 2026-10-30).
  const n = effectiveParams(a).length;
  if (n >= 2) return { category: 'equivocal', reason: 'twoParams2h', rechecks };
  if (n === 1 && a.oneParamGe4h === true) return { category: 'equivocal', reason: 'oneParam4h', rechecks };
  if (n === 1) return { category: 'well', reason: 'signsTooShort', rechecks: [...rechecks, 'signsAt4h'] };
  // No sign has lasted 2 h yet; one that later does means running the page again.
  return { category: 'well', reason: 'noSigns', rechecks: [...rechecks, 'signsAt2h'] };
}
