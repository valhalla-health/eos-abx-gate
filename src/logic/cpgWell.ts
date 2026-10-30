import type { Answers, Fever, WellPath } from '../data/types';

// KCMH CPG: >=39.0 once, or 38.0-38.9 still >=38.0 on a repeat. Not repeated counts as fever (SRS 4.4).
export function isDocumentedFever(f: Fever): boolean {
  return f === 'ge39' || f === 'repeatStillHigh' || f === 'notRepeated';
}

// null when an answer the leaf depends on is missing, so a caller cannot read a missing fever or IAP
// answer as "no" and land on routine care (fails closed; the engine never shows a result that early).
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

export function wellAction(path: WellPath): 'abx' | 'serial48to72' | 'routine' {
  switch (path) {
    case 'confirmedTripleI':
      return 'abx';
    case 'suspectedTripleI':
    case 'isolatedFever':
    case 'inadequateIap':
      return 'serial48to72';
    case 'noIapIndication':
    case 'adequateIap':
      return 'routine';
  }
}
