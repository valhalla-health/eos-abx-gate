import { BASE_INTERCEPT, COEF, KPNC_RATE, LR, SITE_INTERCEPTS } from '../data/kaiser2024';
import type { AbxTiming, GbsStatus, MatAbx } from '../data/types';

export interface KaiserInput {
  gaWeeks: number;
  gaDays: number;
  tempF: number;
  romHours: number;
  gbs: GbsStatus;
  abx1: boolean;
  abx2: boolean;
}

const logit = (p: number) => Math.log(p / (1 - p));
const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

export function exactIntercept(incidencePer1000: number): number {
  return BASE_INTERCEPT + logit(incidencePer1000 / 1000) - logit(KPNC_RATE);
}

export function intercept(incidencePer1000: number): number {
  return SITE_INTERCEPTS[String(incidencePer1000)] ?? round(exactIntercept(incidencePer1000), 1);
}

// The Kaiser site converts a °C entry without rounding. Rounding to 2 decimals here equals the
// unrounded value for the one-decimal entries the page accepts and removes float noise (SRS 4.2).
export function cToF(c: number): number {
  return round((c * 9) / 5 + 32, 2);
}

// Kaiser 2024: abx1 = GBS-specific >=2 h or broad-spectrum 2-3.9 h; abx2 = broad-spectrum >=4 h.
// Timing <2 h, unknown or missing earns no credit (SRS 4.4).
export function abxIndicators(matAbx: MatAbx, timing: AbxTiming | undefined): { abx1: boolean; abx2: boolean } {
  if (matAbx === 'gbsSpecific' && (timing === 'ge4' || timing === '2to4')) return { abx1: true, abx2: false };
  if (matAbx === 'broad' && timing === 'ge4') return { abx1: false, abx2: true };
  if (matAbx === 'broad' && timing === '2to4') return { abx1: true, abx2: false };
  return { abx1: false, abx2: false };
}

export function riskAtBirth(x: KaiserInput, incidencePer1000: number): number {
  const ga = x.gaWeeks + x.gaDays / 7;
  const bx =
    intercept(incidencePer1000) +
    COEF.tempF * x.tempF +
    COEF.ga * ga +
    COEF.gaSq * ga * ga +
    COEF.rom * Math.pow(x.romHours + 0.05, 0.2) +
    (x.abx1 ? COEF.abx1 : 0) +
    (x.abx2 ? COEF.abx2 : 0) +
    (x.gbs === 'pos' ? COEF.gbsPos : 0) +
    (x.gbs === 'unk' ? COEF.gbsUnknown : 0);
  return 1000 / (1 + Math.exp(-bx));
}

export function posterior(priorPer1000: number, lr: number): number {
  const p = priorPer1000 / 1000;
  const odds = (p / (1 - p)) * lr;
  return (odds / (1 + odds)) * 1000;
}

export function equivocalPosterior(atBirthPer1000: number): number {
  return posterior(atBirthPer1000, LR.equivocal);
}

// The one 2-decimal text for a risk per 1000. The screen, the note and band() all read it, so the
// number the user sees and the action it leads to cannot disagree at x.xx5. (toFixed(2) alone
// shows 0.995 as "0.99", because that double sits just below 0.995.)
export function formatPer1000(per1000: number): string {
  return round(per1000, 2).toFixed(2);
}

// Compared at the 2 decimals the user sees.
export function band(posteriorPer1000: number): 'observe' | 'cultureNoAbx' | 'cultureAbx' {
  const shown = Number(formatPer1000(posteriorPer1000));
  if (shown >= 3) return 'cultureAbx';
  if (shown >= 1) return 'cultureNoAbx';
  return 'observe';
}
