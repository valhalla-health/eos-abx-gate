import type { AbxTiming, Action, Category, EquivParam, GbsStatus, MatAbx, Override, ReasonCode, Recheck, WellPath } from './types';

// English text for the progress note.
export const SUMMARY = {
  category: {
    outOfScope: 'Out of scope',
    clinicalIllness: 'Clinical illness',
    equivocal: 'Equivocal',
    well: 'Well-appearing',
  } satisfies Record<Category, string>,
  reason: {
    gaBelow35: 'GA below 35 wk',
    cpap: 'CPAP/HFNC/ventilator needed outside the delivery room',
    o2Ge2h: 'O2 needed for SpO2 >90% for 2 h or more',
    vasoOrBolus: 'vasoactive drug or fluid bolus for hypotension/poor perfusion',
    seizure: 'seizure',
    apgar: '5-min Apgar below 5',
    apnea: 'apnea',
    poorFeeding: 'poor feeding, checked by staff',
    lethargy: 'lethargy or irritability, checked by staff',
    oneParam4h: 'one sign continuous for 4 h or more',
    twoParams2h: 'two or more signs continuous for 2 h or more',
    noSigns: 'no sign meeting clinical-illness or equivocal criteria',
    signsTooShort: 'one sign, continuous for less than 4 h',
  } satisfies Record<ReasonCode, string>,
  action: {
    outOfScope: 'not covered (GA <35 wk); clinical judgement, discuss with staff',
    abx: 'admit Sick NB unit, CBC + blood culture, empiric antibiotics',
    observe: 'serial PE with VS, NO lab, NO antibiotics',
    cultureNoAbx: 'CBC + blood culture, VS q4h x 24 h, NO antibiotics',
    cultureAbx: 'CBC + blood culture, empiric antibiotics',
    kaiserUnavailable: 'Kaiser not computed (maternal Tmax or ROM missing); discuss with staff',
    incomplete: 'answers incomplete, no action computed; discuss with staff',
    serial48to72: 'serial assessment with VS for 48-72 h, NO lab, NO antibiotics',
    routine: 'routine care',
  } satisfies Record<Action, string>,
  wellPath: {
    confirmedTripleI: 'maternal fever, confirmed Triple I',
    suspectedTripleI: 'maternal fever, suspected Triple I',
    isolatedFever: 'isolated maternal fever',
    noIapIndication: 'no fever, no GBS IAP indication',
    adequateIap: 'no fever, GBS IAP indication, adequate IAP',
    inadequateIap: 'no fever, GBS IAP indication, IAP not adequate',
  } satisfies Record<WellPath, string>,
  recheck: {
    o2At2h: 'run again if O2 is still needed at 2 h',
    signsAt2h: 'run again if any sign lasts 2 h continuously',
    signsAt4h: 'run again if the sign lasts 4 h continuously or a second sign lasts 2 h continuously',
  } satisfies Record<Recheck, string>,
  overrideReason: {
    staffOrder: 'staff decision',
    motherSevere: 'mother severely ill (e.g. bacteremia, septic shock)',
  } satisfies Record<Exclude<Override['reason'], 'other'>, string>,
  // The input echo: what the resident ticked and what Kaiser was given (SRS section 5). Every sign
  // ticked was continuous for 2 h or more; with one sign the line also says whether it reached 4 h.
  signsLabel: 'Signs continuous ≥2 h since delivery room',
  oneSign4h: { reached: 'reached 4 h', notYet: 'not yet 4 h' },
  signs: {
    hr: 'HR ≥160',
    rr: 'RR ≥60',
    temp: 'T ≥38.0 or <36.5 °C',
    resp: 'grunting/flaring/retraction without O2',
  } satisfies Record<EquivParam, string>,
  gbs: { pos: 'pos', neg: 'neg', unk: 'unknown' } satisfies Record<GbsStatus, string>,
  matAbx: {
    none: 'none',
    gbsSpecific: 'penicillin/ampicillin/cefazolin only',
    broad: 'broad-spectrum',
    notCounted: 'clindamycin/vancomycin/erythromycin only',
  } satisfies Record<MatAbx, string>,
  abxTiming: {
    ge4: '≥4 h before delivery',
    '2to4': '2-3.9 h before delivery',
    lt2: '<2 h before delivery',
    unknown: 'timing unknown',
  } satisfies Record<AbxTiming, string>,
  gaDaysUnknown: 'days unknown: risk is the higher of +0 and +6 d',
};

// Thai text on screen.
export const RESULT_TH = {
  // The category pill under the headline. Below 35 weeks there is no category to show.
  category: {
    clinicalIllness: 'Clinical illness',
    equivocal: 'Equivocal',
    well: 'Well-appearing',
  } satisfies Record<Exclude<Category, 'outOfScope'>, string>,
  reason: {
    gaBelow35: 'GA ต่ำกว่า 35 wk ไม่อยู่ใน CPG นี้',
    cpap: 'ต้องใช้ CPAP, HFNC หรือ ventilator หลังออกจากห้องคลอด',
    o2Ge2h: 'ต้องใช้ O₂ เพื่อให้ SpO₂ มากกว่า 90% มานาน 2 ชม. ขึ้นไป',
    vasoOrBolus: 'ได้ vasoactive หรือ fluid bolus เพราะความดันต่ำหรือ perfusion ไม่ดี',
    seizure: 'มี seizure',
    apgar: 'Apgar 5 นาทีต่ำกว่า 5',
    apnea: 'มี apnea ตามเกณฑ์',
    poorFeeding: 'poor feeding และ staff ดูแล้วเห็นด้วย',
    lethargy: 'ซึมหรือกระสับกระส่าย และ staff ดูแล้วเห็นด้วย',
    oneParam4h: 'ผิดปกติ 1 ข้อ ต่อเนื่อง 4 ชม. ขึ้นไป',
    twoParams2h: 'ผิดปกติ 2 ข้อขึ้นไป ต่อเนื่อง 2 ชม. ขึ้นไป',
    noSigns: 'ไม่มีอาการที่เข้าเกณฑ์ clinical illness หรือ equivocal',
    signsTooShort: 'มีอาการ 1 ข้อ แต่ต่อเนื่องยังไม่ถึง 4 ชม.',
  } satisfies Record<ReasonCode, string>,
  // The result banner: the decision in two or three words, then one line of what to do (Pp, 2026-10-29).
  action: {
    abx: { headline: 'ให้ ABX', line: 'Admit Sick NB · CBC + H/C · empiric ABX' },
    cultureAbx: { headline: 'ให้ ABX', line: 'CBC + H/C · empiric ABX' },
    cultureNoAbx: { headline: 'ยังไม่ให้ ABX', line: 'CBC + H/C · VS ทุก 4 ชม. นาน 24 ชม.' },
    observe: { headline: 'ไม่ให้ ABX', line: 'Serial PE + VS · ไม่ต้องส่ง lab' },
    serial48to72: { headline: 'ไม่ให้ ABX', line: 'Serial assessment + VS 48–72 ชม.' },
    routine: { headline: 'ไม่ให้ ABX', line: 'ดูแลตามปกติที่ nursery' },
    kaiserUnavailable: { headline: 'ปรึกษา staff', line: 'ข้อมูลไม่พอคำนวณ Kaiser' },
    outOfScope: { headline: 'ใช้หน้านี้ไม่ได้', line: 'GA ต่ำกว่า 35 wk ปรึกษา staff' },
    incomplete: { headline: 'ปรึกษา staff', line: 'ยังตอบไม่ครบ' },
  } satisfies Record<Action, { headline: string; line: string }>,
  // The CPG path of a well-appearing baby, the Thai twin of SUMMARY.wellPath, inside ดูเหตุผลและข้อความ.
  wellPath: {
    confirmedTripleI: 'แม่มีไข้ และเข้าเกณฑ์ confirmed Triple I',
    suspectedTripleI: 'แม่มีไข้ และเข้าเกณฑ์ suspected Triple I',
    isolatedFever: 'แม่มีไข้อย่างเดียว ไม่เข้าเกณฑ์ Triple I',
    noIapIndication: 'แม่ไม่มีไข้ และไม่มีข้อบ่งชี้ GBS IAP',
    adequateIap: 'แม่ไม่มีไข้ มีข้อบ่งชี้ GBS IAP และได้ IAP ครบ',
    inadequateIap: 'แม่ไม่มีไข้ มีข้อบ่งชี้ GBS IAP แต่ IAP ไม่ครบหรือไม่ทราบ',
  } satisfies Record<WellPath, string>,
  recheck: {
    o2At2h: 'ถ้ายังต้องใช้ O₂ ตอนครบ 2 ชม. ให้เปิดหน้านี้ใหม่',
    signsAt2h: 'ถ้ามีอาการผิดปกติต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่',
    signsAt4h: 'ถ้าอาการนี้ต่อเนื่องครบ 4 ชม. หรือมีอาการอีกข้อต่อเนื่องครบ 2 ชม. ให้เปิดหน้านี้ใหม่',
  } satisfies Record<Recheck, string>,
  // Inside ดูเหตุผลและข้อความ: the model and incidence on one line, then one row per risk. The screen
  // prints each risk through formatPer1000 (src/logic/kaiser.ts), the formatter the note uses.
  kaiser: {
    model: (incidence: number) => `Kaiser 2024 · incidence ${incidence}/1000`,
    atBirth: 'แรกเกิด',
    afterExam: 'หลังประเมิน',
  },
  // The pill next to the category: "Kaiser" and the after-exam risk.
  kaiserPill: 'Kaiser',
};

export const START_TH = {
  title: 'EOS ABX Gate',
  body: 'ใช้ก่อนเริ่ม ABX ในทารกที่สงสัย EOS กดตอบทีละข้อจนได้คำตอบ',
  limits: ['GA 35 wk ขึ้นไป', 'อายุไม่เกิน 72 ชม.'],
  go: 'เริ่ม',
};

export const UI_TH = {
  next: 'ต่อไป',
  back: 'ย้อนกลับ',
  restart: 'เริ่มใหม่',
  copy: 'คัดลอกข้อความสรุป',
  copied: 'คัดลอกแล้ว วางใน progress note ได้เลย',
  copyManually: 'เลือกข้อความไว้แล้ว กด Ctrl+C เพื่อคัดลอก',
  override: 'จะให้ ABX ต่างจากนี้',
  why: 'ดูเหตุผลและข้อความ',
  range: (min: number, max: number) => `ใส่ตัวเลขระหว่าง ${min} ถึง ${max}`,
};

export const NEED_STAFF_TH = 'ให้ staff มาดูเด็กก่อน ข้อนี้นับได้เมื่อ staff ดูเองแล้วเห็นด้วย';

export const OVERRIDE_TH = {
  title: 'ให้ ABX ต่างจากผลนี้',
  reasons: {
    staffOrder: 'staff สั่ง',
    motherSevere: 'แม่ป่วยหนัก เช่น bacteremia หรือ septic shock',
    other: 'อื่น ๆ',
  } satisfies Record<Override['reason'], string>,
  otherText: 'เหตุผลสั้น ๆ ไม่ต้องใส่ชื่อหรือ HN',
  staff: 'ชื่อ staff ที่เห็นด้วย',
  save: 'บันทึก',
  cancel: 'ยกเลิก',
  missing: 'เลือกเหตุผลและใส่ชื่อ staff ก่อน',
};

// The Kaiser credit with its link (Kaiser asks for it; SRS section 7 release gate), then the CPG, the
// draft status and the privacy promise, joined by " · ". Two lines on a 375 px phone. The link's title
// holds the calculator's full name.
export const FOOTER = {
  kaiserLink: 'Kaiser Permanente 2024',
  kaiserName: 'Kaiser Permanente Neonatal Early-Onset Sepsis Calculator',
  items: ['CPG EOS รพ.จุฬาฯ', 'นิยามฉบับร่าง', 'ไม่เก็บและไม่ส่งข้อมูล'],
};
