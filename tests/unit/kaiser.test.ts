import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/kaiser-site-2024.json';
import { LR, SITE_INTERCEPTS } from '../../src/data/kaiser2024';
import type { GbsStatus } from '../../src/data/types';
import {
  abxIndicators,
  band,
  cToF,
  equivocalPosterior,
  exactIntercept,
  formatPer1000,
  intercept,
  posterior,
  riskAtBirth,
} from '../../src/logic/kaiser';

type SiteAbx = 'none' | 'gbs2' | 'broad2to4' | 'broad4';
const siteIndicators = (s: SiteAbx) => ({ abx1: s === 'gbs2' || s === 'broad2to4', abx2: s === 'broad4' });

describe('intercept', () => {
  it.each(Object.entries(SITE_INTERCEPTS))('formula reproduces the site value at %s/1000', (inc, value) => {
    expect(Math.round(exactIntercept(Number(inc)) * 10) / 10).toBe(value);
  });
  it('uses the site value for a listed incidence', () => {
    expect(intercept(0.5)).toBe(57.9);
  });
  it('falls back to the rounded formula for an unlisted incidence', () => {
    expect(intercept(1.5)).toBe(Math.round(exactIntercept(1.5) * 10) / 10);
  });
});

describe('cToF', () => {
  it.each([
    [37.0, 98.6],
    [38.0, 100.4],
    [36.5, 97.7],
    [36.9, 98.42],
    [38.2, 100.76],
    [38.3, 100.94],
    [39.1, 102.38],
  ])('%s °C is %s °F', (c, f) => {
    expect(cToF(c)).toBe(f);
  });
  // Every one-decimal °C entry the page accepts (30.0 to 45.0) converts exactly as the site does,
  // without rounding: the 2-decimal rounding only removes float noise (SRS 4.2).
  it('equals the unrounded conversion for every one-decimal entry from 30.0 to 45.0 °C', () => {
    for (let tenths = 300; tenths <= 450; tenths++) {
      const c = tenths / 10;
      expect(cToF(c)).toBeCloseTo((c * 9) / 5 + 32, 10);
    }
  });
});

describe('abxIndicators', () => {
  it.each([
    ['none', undefined, false, false],
    ['notCounted', 'ge4', false, false],
    ['gbsSpecific', 'ge4', true, false],
    ['gbsSpecific', '2to4', true, false],
    ['gbsSpecific', 'lt2', false, false],
    ['broad', 'ge4', false, true],
    ['broad', '2to4', true, false],
    ['broad', 'lt2', false, false],
    ['broad', 'unknown', false, false],
  ] as const)('%s given %s → abx1 %s, abx2 %s', (drug, timing, abx1, abx2) => {
    expect(abxIndicators(drug, timing)).toEqual({ abx1, abx2 });
  });
});

describe('band', () => {
  it.each([
    [0.99, 'observe'],
    [1.0, 'cultureNoAbx'],
    [2.99, 'cultureNoAbx'],
    [2.996, 'cultureAbx'],
    [3.0, 'cultureAbx'],
  ] as const)('%s/1000 → %s', (p, expected) => {
    expect(band(p)).toBe(expected);
  });
});

// toFixed(2) alone shows 0.995 as "0.99" (the double sits just below 0.995), while band() read it as
// 1.00 and advised culture. One formatter now feeds the screen, the note and band().
describe('formatPer1000 and band agree at x.xx5', () => {
  it.each([
    [0.995, '1.00', 'cultureNoAbx'],
    [2.995, '3.00', 'cultureAbx'],
  ] as const)('%s/1000 shows as %s and leads to %s', (p, shown, action) => {
    expect(formatPer1000(p)).toBe(shown);
    expect(band(p)).toBe(action);
  });
});

type SiteCase = (typeof fixture.cases)[number];

// All four site numbers of a case, within 0.005 (the site shows 2 decimals).
function expectSiteMatch(c: SiteCase, tempF: number): void {
  const atBirth = riskAtBirth(
    {
      gaWeeks: c.gaWeeks,
      gaDays: c.gaDays,
      tempF,
      romHours: c.romHours,
      gbs: c.gbs as GbsStatus,
      ...siteIndicators(c.siteAbx as SiteAbx),
    },
    fixture.incidencePer1000,
  );
  expect(atBirth).toBeCloseTo(c.site.atBirth, 2);
  expect(posterior(atBirth, LR.well)).toBeCloseTo(c.site.well, 2);
  expect(equivocalPosterior(atBirth)).toBeCloseTo(c.site.equivocal, 2);
  expect(posterior(atBirth, LR.clinicalIllness)).toBeCloseTo(c.site.clinicalIllness, 2);
}

const fahrenheitCases = fixture.cases.filter((c) => c.tempF !== undefined);
const celsiusCases = fixture.cases.filter((c) => c.tempC !== undefined);

describe('riskAtBirth and posterior match the official site', () => {
  it.each(fahrenheitCases)('$id (entered in °F)', (c) => expectSiteMatch(c, c.tempF ?? Number.NaN));
});

// c21-c24 were entered on the site in °C (2026-10-29). The site converts °C × 9/5 + 32 without
// rounding; cToF gives the same value for a one-decimal entry (SRS 4.2, CODE_REVIEW F-I2).
describe('cases entered on the site in °C', () => {
  it.each(celsiusCases)('$id: the site uses the unrounded °F', (c) => {
    expectSiteMatch(c, ((c.tempC ?? Number.NaN) * 9) / 5 + 32);
  });
  it.each(celsiusCases)('$id: the page (cToF) matches the site', (c) => {
    expectSiteMatch(c, cToF(c.tempC ?? Number.NaN));
  });
});

describe('site fixture', () => {
  it('has at least 20 recorded cases (SRS section 6)', () => {
    expect(fixture.cases.length).toBeGreaterThanOrEqual(20);
  });
  it('has at least 4 cases entered on the site in °C', () => {
    expect(fixture.cases.filter((c) => 'tempC' in c).length).toBeGreaterThanOrEqual(4);
  });
});
