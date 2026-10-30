import type { Answers, Result } from '../data/types';
import { classify, pendingEquivTimingKey } from './classify';
import { wellAction, wellPath } from './cpgWell';
import { abxIndicators, band, cToF, equivocalPosterior, riskAtBirth } from './kaiser';

export function recommend(a: Answers, incidencePer1000: number): Result {
  const classification = classify(a);
  switch (classification.category) {
    case 'outOfScope':
      return { classification, action: 'outOfScope' };
    case 'clinicalIllness':
      return { classification, action: 'abx' };
    case 'equivocal': {
      if (a.gaWeeks === undefined || a.tmaxC == null || a.romHours == null || !a.gbs || !a.matAbx) {
        return { classification, action: 'kaiserUnavailable' };
      }
      const input = {
        gaWeeks: a.gaWeeks,
        tempF: cToF(a.tmaxC),
        romHours: a.romHours,
        gbs: a.gbs,
        ...abxIndicators(a.matAbx, a.abxTiming),
      };
      // Unknown GA days → the higher of the 0-day and 6-day risk (SRS 4.4). The GA term is
      // convex (lowest near 39 wk), so the maximum over 0-6 days sits at one of the two ends.
      const atBirth =
        a.gaDays == null
          ? Math.max(
              riskAtBirth({ ...input, gaDays: 0 }, incidencePer1000),
              riskAtBirth({ ...input, gaDays: 6 }, incidencePer1000),
            )
          : riskAtBirth({ ...input, gaDays: a.gaDays }, incidencePer1000);
      const afterExam = equivocalPosterior(atBirth);
      // A NaN or infinite risk (negative ROM hours, NaN input, overflow) would fall through band() to
      // 'observe'. Fail closed instead.
      if (!Number.isFinite(atBirth) || !Number.isFinite(afterExam)) {
        return { classification, action: 'kaiserUnavailable' };
      }
      return { classification, action: band(afterExam), kaiser: { atBirth, afterExam } };
    }
    case 'well': {
      // classify() reads an unanswered sign or duration as "no", which leans toward routine care, so a
      // well result needs the signs, their durations and the CPG answers. Unreachable from the UI.
      const path = a.equivParams === undefined || pendingEquivTimingKey(a) !== null ? null : wellPath(a);
      if (path === null) return { classification, action: 'incomplete' };
      const action = wellAction(path);
      // Confirmed Triple I already gives Admit Sick NB and ABX; no re-check can change that (Pp, 2026-10-30).
      if (action === 'abx') return { classification: { ...classification, rechecks: [] }, action, wellPath: path };
      return { classification, action, wellPath: path };
    }
  }
}
