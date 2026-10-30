import type { AnswerKey, Answers } from '../data/types';
import { classify, clinicalIllnessReason, pendingEquivTimingKey } from '../logic/classify';
import { isDocumentedFever } from '../logic/cpgWell';

export type Step = { kind: 'question'; key: AnswerKey } | { kind: 'needStaff' } | { kind: 'result' };

const ask = (key: AnswerKey): Step => ({ kind: 'question', key });
const RESULT: Step = { kind: 'result' };
const NEED_STAFF: Step = { kind: 'needStaff' };

const YES_NO_ITEMS = ['vasoOrBolus', 'seizure', 'apgar5Below5', 'apnea'] as const;
const STAFF_ITEMS = [
  ['poorFeeding', 'poorFeedingStaffChecked'],
  ['lethargy', 'lethargyStaffChecked'],
] as const;

// The first question that still needs an answer, or where the walk ends (SRS section 3).
export function nextStep(a: Answers): Step {
  if (a.gaWeeks === undefined) return ask('gaWeeks');
  if (classify(a).category === 'outOfScope') return RESULT;

  if (a.resp === undefined) return ask('resp');
  if (a.resp === 'o2' && a.o2Needed === undefined) return ask('o2Needed');
  if (a.resp === 'o2' && a.o2Needed === true && a.o2Ge2h === undefined) return ask('o2Ge2h');
  if (clinicalIllnessReason(a)) return RESULT;

  // After each answer the walk ends only when logic/classify says the baby now has clinical illness,
  // so if the two ever disagree the page asks more questions instead of stopping early.
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

  if (a.equivParams === undefined) return ask('equivParams');
  const timing = pendingEquivTimingKey(a);
  if (timing) return ask(timing);

  return classify(a).category === 'equivocal' ? nextKaiserStep(a) : nextWellStep(a);
}

function nextKaiserStep(a: Answers): Step {
  if (a.gaDays === undefined) return ask('gaDays');
  if (a.tmaxC === undefined) return ask('tmaxC');
  if (a.tmaxC === null) return RESULT;
  if (a.romHours === undefined) return ask('romHours');
  if (a.romHours === null) return RESULT;
  if (a.gbs === undefined) return ask('gbs');
  if (a.matAbx === undefined) return ask('matAbx');
  const counts = a.matAbx === 'gbsSpecific' || a.matAbx === 'broad';
  if (counts && a.abxTiming === undefined) return ask('abxTiming');
  return RESULT;
}

function nextWellStep(a: Answers): Step {
  if (a.fever === undefined) return ask('fever');
  if (isDocumentedFever(a.fever)) {
    if (a.suspected === undefined) return ask('suspected');
    if (a.suspected.length > 0 && a.confirmed === undefined) return ask('confirmed');
    return RESULT;
  }
  if (a.iapIndications === undefined) return ask('iapIndications');
  if (a.iapIndications.length > 0 && a.adequateIap === undefined) return ask('adequateIap');
  return RESULT;
}
