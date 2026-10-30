import { APP_VERSION, DEFINITIONS_STATUS } from '../data/config';
import { SUMMARY } from '../data/text';
import type { Answers, Override, Result } from '../data/types';
import { effectiveParams } from './classify';
import { cToF, formatPer1000 } from './kaiser';

const pad = (n: number) => String(n).padStart(2, '0');

export function stamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function gaText(a: Answers): string {
  if (a.gaWeeks === undefined) return '';
  if (a.gaWeeks < 35) return '<35 wk';
  if (a.gaDays === undefined) return `${a.gaWeeks} wk`;
  return `${a.gaWeeks}+${a.gaDays ?? '?'} wk`;
}

// 37 prints as 37.0; a value typed with more decimals prints as typed.
const oneDecimal = (x: number) => (String(x).includes('.') ? String(x) : x.toFixed(1));

function overrideText(o: Override): string {
  return o.reason === 'other' ? o.otherText : SUMMARY.overrideReason[o.reason];
}

// The signs the decision counted, each continuous for 2 h or more; with one sign, whether it reached
// 4 h. Asked only on the equivocal and well paths.
function signsLine(a: Answers, r: Result): string | null {
  const { category } = r.classification;
  if (category !== 'equivocal' && category !== 'well') return null;
  const params = effectiveParams(a);
  let signs = params.length > 0 ? params.map((p) => SUMMARY.signs[p]).join(', ') : 'none';
  if (params.length === 1 && a.oneParamGe4h !== undefined) {
    signs += ` (${a.oneParamGe4h ? SUMMARY.oneSign4h.reached : SUMMARY.oneSign4h.notYet})`;
  }
  return `${SUMMARY.signsLabel}: ${signs}`;
}

// What Kaiser was given, only when it ran (recommend checked every input first).
function kaiserInputsLine(a: Answers, r: Result): string | null {
  if (!r.kaiser || a.gaWeeks === undefined || a.tmaxC == null || a.romHours == null || !a.gbs || !a.matAbx) return null;
  const ga = a.gaDays == null ? `GA ${a.gaWeeks}+? wk (${SUMMARY.gaDaysUnknown})` : `GA ${a.gaWeeks}+${a.gaDays} wk`;
  const abx = a.abxTiming ? `${SUMMARY.matAbx[a.matAbx]}, ${SUMMARY.abxTiming[a.abxTiming]}` : SUMMARY.matAbx[a.matAbx];
  return [
    `Kaiser inputs: ${ga}`,
    `Tmax ${oneDecimal(a.tmaxC)} °C (${cToF(a.tmaxC).toFixed(2)} °F)`,
    `ROM ${a.romHours} h`,
    `GBS ${SUMMARY.gbs[a.gbs]}`,
    `maternal abx ${abx}`,
  ].join(', ');
}

// Plain text for the progress note. No identifiers (SRS section 5).
export function summaryText(a: Answers, r: Result, now: Date, incidencePer1000: number): string {
  const c = r.classification;
  const lines = [
    `EOS ABX Gate v${APP_VERSION} | ${stamp(now)}`,
    `GA ${gaText(a)} | Category: ${SUMMARY.category[c.category]} (${SUMMARY.reason[c.reason]})`,
  ];
  const signs = signsLine(a, r);
  if (signs) lines.push(signs);
  const inputs = kaiserInputsLine(a, r);
  if (inputs) lines.push(inputs);
  if (r.kaiser) {
    lines.push(
      `Kaiser 2024, incidence ${incidencePer1000}/1000: at birth ${formatPer1000(r.kaiser.atBirth)}/1000, after exam ${formatPer1000(r.kaiser.afterExam)}/1000`,
    );
  }
  if (r.wellPath) lines.push(`CPG path: ${SUMMARY.wellPath[r.wellPath]}`);
  lines.push(`Action (KCMH CPG): ${SUMMARY.action[r.action]}`);
  for (const rc of c.rechecks) lines.push(`Re-check: ${SUMMARY.recheck[rc]}`);
  lines.push(a.override ? `Override: ${overrideText(a.override)} | agreed by ${a.override.staff}` : 'Override: none');
  lines.push(`Definitions: ${DEFINITIONS_STATUS}`);
  return lines.join('\n');
}
