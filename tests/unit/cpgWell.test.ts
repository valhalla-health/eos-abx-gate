import { describe, expect, it } from 'vitest';
import type { Answers, WellPath } from '../../src/data/types';
import { isDocumentedFever, wellAction, wellPath } from '../../src/logic/cpgWell';

describe('isDocumentedFever', () => {
  it.each([
    ['ge39', true],
    ['repeatStillHigh', true],
    ['notRepeated', true], // SRS 4.4: not repeated counts as fever
    ['repeatLower', false],
    ['none', false],
  ] as const)('%s → %s', (f, expected) => {
    expect(isDocumentedFever(f)).toBe(expected);
  });
});

describe('wellPath and wellAction (one test per CPG leaf)', () => {
  const cases: [string, Answers, string, string][] = [
    ['confirmed Triple I', { fever: 'ge39', suspected: ['matWbc'], confirmed: ['placenta'] }, 'confirmedTripleI', 'abx'],
    ['suspected Triple I', { fever: 'ge39', suspected: ['matWbc'], confirmed: [] }, 'suspectedTripleI', 'serial48to72'],
    ['isolated fever', { fever: 'repeatStillHigh', suspected: [] }, 'isolatedFever', 'serial48to72'],
    ['no fever, no IAP indication', { fever: 'none', iapIndications: [] }, 'noIapIndication', 'routine'],
    ['no fever, adequate IAP', { fever: 'repeatLower', iapIndications: ['gbsPos'], adequateIap: true }, 'adequateIap', 'routine'],
    ['no fever, IAP not adequate', { fever: 'none', iapIndications: ['termRom18'], adequateIap: false }, 'inadequateIap', 'serial48to72'],
    ['no fever, IAP unknown', { fever: 'none', iapIndications: ['bacteriuria'], adequateIap: null }, 'inadequateIap', 'serial48to72'],
  ];
  it.each(cases)('%s', (_name, a, path, action) => {
    expect(wellPath(a)).toBe(path);
    expect(wellAction(path as WellPath)).toBe(action);
  });

  // A missing answer must not read as "no" (that would be routine care); the leaf is unknown.
  it.each([
    ['fever not answered', { iapIndications: [] }],
    ['documented fever, suspected criteria not answered', { fever: 'ge39' }],
    ['suspected Triple I, confirmed criteria not answered', { fever: 'ge39', suspected: ['matWbc'] }],
    ['no fever, IAP indications not answered', { fever: 'none' }],
    ['an IAP indication, adequacy not answered', { fever: 'none', iapIndications: ['gbsPos'] }],
  ] as [string, Answers][])('%s gives no leaf', (_name, a) => {
    expect(wellPath(a)).toBeNull();
  });

  // Deliberate: confirmed criteria count only on top of a suspected one (SRS 4.3), so a confirmed
  // answer left over with no suspected criterion is ignored. The engine never asks confirmed then.
  it('a stale confirmed answer with no suspected criterion stays isolated fever', () => {
    const a: Answers = { fever: 'ge39', suspected: [], confirmed: ['placenta'] };
    expect(wellPath(a)).toBe('isolatedFever');
    expect(wellAction('isolatedFever')).toBe('serial48to72');
  });
});
