import type { AnswerKey } from './types';

export interface ChoiceOption {
  label: string;
  value: string | number | boolean | null;
}

// hint: one short line under the title. more: a longer list kept behind a closed <details>.
interface QuestionText {
  title: string;
  hint?: string;
  more?: { summary: string; lines: string[] };
}

export type QuestionDef = QuestionText &
  (
    | { kind: 'choice'; options: ChoiceOption[] }
    | { kind: 'multi'; options: { label: string; value: string }[]; noneLabel: string }
    | { kind: 'number'; unit: string; min: number; max: number; noValueLabel: string }
  );

const yesNo = (yes: string, no: string): ChoiceOption[] => [
  { label: yes, value: true },
  { label: no, value: false },
];

export const QUESTIONS: Record<AnswerKey, QuestionDef> = {
  gaWeeks: {
    kind: 'choice',
    title: 'GA กี่ wk',
    options: [{ label: 'ต่ำกว่า 35 wk', value: 34 }, ...[35, 36, 37, 38, 39, 40, 41, 42].map((w) => ({ label: `${w} wk`, value: w }))],
  },
  resp: {
    kind: 'choice',
    title: 'ตั้งแต่ออกจากห้องคลอด ต้องใช้อะไรช่วยหายใจมากที่สุด',
    options: [
      { label: 'ไม่ใช้', value: 'none' },
      { label: 'O₂', value: 'o2' },
      { label: 'CPAP, HFNC หรือ ventilator', value: 'cpap' },
    ],
  },
  o2Needed: {
    kind: 'choice',
    title: 'ต้องใช้ O₂ เพื่อให้ SpO₂ มากกว่า 90% ไหม',
    options: yesNo('ใช่ ถ้าไม่ให้ SpO₂ จะต่ำกว่า 90%', 'ไม่ใช่ SpO₂ ดีอยู่แล้ว'),
  },
  o2Ge2h: { kind: 'choice', title: 'ใช้ O₂ มานานรวมเท่าไร นับตั้งแต่ออกจากห้องคลอด', options: yesNo('2 ชม. ขึ้นไป', 'ยังไม่ถึง 2 ชม.') },
  vasoOrBolus: {
    kind: 'choice',
    title: 'ได้ vasoactive หรือได้ fluid bolus เพราะความดันต่ำหรือ CRT นานกว่า 3 วินาทีไหม',
    options: yesNo('ได้', 'ไม่ได้'),
  },
  seizure: { kind: 'choice', title: 'มี seizure ไหม', options: yesNo('มี', 'ไม่มี') },
  apgar5Below5: { kind: 'choice', title: 'Apgar 5 นาทีต่ำกว่า 5 ไหม', options: yesNo('ใช่', 'ไม่ใช่') },
  apnea: {
    kind: 'choice',
    title: 'มี apnea ไหม',
    hint: 'หยุดหายใจ 20 วินาทีขึ้นไป หรือสั้นกว่านั้นแต่ HR ต่ำกว่า 100 หรือ SpO₂ ตก',
    options: yesNo('มี', 'ไม่มี'),
  },
  poorFeeding: {
    kind: 'choice',
    title: 'ดูดนมไม่ได้หรือไม่ยอมดูดติดกัน 2 มื้อ จนต้องใส่ OG หรือให้ IV ไหม',
    options: yesNo('ใช่', 'ไม่ใช่'),
  },
  poorFeedingStaffChecked: { kind: 'choice', title: 'staff มาดูเองแล้วหรือยัง', options: yesNo('staff ดูแล้ว เห็นด้วย', 'ยัง') },
  lethargy: { kind: 'choice', title: 'ซึมหรือกระสับกระส่ายผิดปกติไหม', options: yesNo('ใช่', 'ไม่ใช่') },
  lethargyStaffChecked: {
    kind: 'choice',
    title: 'staff มาดูเองแล้วเห็นว่าซึมหรือกระสับกระส่ายจริงไหม',
    options: yesNo('staff ดูแล้ว เห็นด้วย', 'ยัง'),
  },
  // Only continuous time counts, so a sign is ticked only once it has lasted 2 h (Pp, 2026-10-29),
  // and only while it is still present at assessment (Pp, 2026-10-30). O₂ and CPAP above still count
  // since the delivery room.
  equivParams: {
    kind: 'multi',
    title: 'ตอนประเมิน มีข้อไหนที่ยังเป็นอยู่ และเป็นต่อเนื่องมา 2 ชม. ขึ้นไป',
    hint: 'เลือกได้หลายข้อ หายไปแล้วหรือเป็น ๆ หาย ๆ ไม่นับ',
    options: [
      { label: 'HR 160 ขึ้นไป', value: 'hr' },
      { label: 'RR 60 ขึ้นไป', value: 'rr' },
      { label: 'T 38.0 °C ขึ้นไป หรือต่ำกว่า 36.5 °C', value: 'temp' },
      { label: 'grunting, flaring หรือ retraction โดยไม่ต้องใช้ O₂', value: 'resp' },
    ],
    noneLabel: 'ไม่มีเลย',
  },
  oneParamGe4h: { kind: 'choice', title: 'ข้อนี้เป็นต่อเนื่องนานถึง 4 ชม. หรือยัง', options: yesNo('ถึงแล้ว', 'ยังไม่ถึง') },
  gaDays: {
    kind: 'choice',
    title: 'GA เกินมากี่วัน',
    options: [...[0, 1, 2, 3, 4, 5, 6].map((d) => ({ label: `+${d} วัน`, value: d })), { label: 'ไม่ทราบ', value: null }],
  },
  tmaxC: {
    kind: 'number',
    title: 'อุณหภูมิสูงสุดของแม่ระหว่างคลอด',
    hint: 'ถ้าแม่มีไข้ภายใน 1 ชม. หลังคลอด ใช้ค่านั้นได้',
    unit: '°C',
    min: 34,
    max: 42,
    noValueLabel: 'ไม่มีค่าที่วัดไว้',
  },
  romHours: {
    kind: 'number',
    title: 'ถุงน้ำแตกก่อนคลอดกี่ชั่วโมง',
    hint: 'ถ้านานกว่า 240 ชม. กดไม่ทราบ',
    unit: 'ชม.',
    min: 0,
    // The Kaiser site's own range (RangeValidator3, 0 to 240; 240.5 to 2000 refused, read 2026-10-29).
    max: 240,
    noValueLabel: 'ไม่ทราบ',
  },
  gbs: {
    kind: 'choice',
    title: 'ผล GBS ของแม่',
    options: [
      { label: 'บวก', value: 'pos' },
      { label: 'ลบ', value: 'neg' },
      { label: 'ไม่ทราบ', value: 'unk' },
    ],
  },
  matAbx: {
    kind: 'choice',
    title: 'แม่ได้ ABX อะไรก่อนคลอด',
    // Kaiser 2024 FAQ classes (SRS 4.2). Ampicillin + erythromycin (a PPROM latency regimen) is GBS-specific.
    more: {
      summary: 'ดูรายชื่อยา broad-spectrum',
      lines: [
        'penicillin, ampicillin หรือ cefazolin ร่วมกับ aminoglycoside (เช่น gentamicin), aztreonam, azithromycin หรือ metronidazole',
        'cephalosporin รุ่น 2 ถึง 4, extended-spectrum penicillin, fluoroquinolone, carbapenem, tetracycline หรือ TMP-SMX ตัวเดียวก็นับเป็น broad-spectrum',
        'ampicillin ร่วมกับ erythromycin ให้นับเป็น penicillin, ampicillin หรือ cefazolin อย่างเดียว',
        'ได้หลายตัว ให้เลือกตัวที่กว้างที่สุดที่ให้ครบ',
      ],
    },
    options: [
      { label: 'ไม่ได้', value: 'none' },
      { label: 'penicillin, ampicillin หรือ cefazolin อย่างเดียว', value: 'gbsSpecific' },
      { label: 'broad-spectrum', value: 'broad' },
      { label: 'clindamycin, vancomycin หรือ erythromycin อย่างเดียว', value: 'notCounted' },
    ],
  },
  abxTiming: {
    kind: 'choice',
    title: 'ให้ ABX ครั้งแรกก่อนคลอดนานเท่าไร',
    options: [
      { label: '4 ชม. ขึ้นไป', value: 'ge4' },
      { label: '2 ถึง 3.9 ชม.', value: '2to4' },
      { label: 'ไม่ถึง 2 ชม.', value: 'lt2' },
      { label: 'ไม่ทราบ', value: 'unknown' },
    ],
  },
  fever: {
    kind: 'choice',
    title: 'แม่มีไข้ระหว่างคลอดไหม',
    options: [
      { label: '39.0 °C ขึ้นไป', value: 'ge39' },
      { label: '38.0–38.9 °C วัดซ้ำ 30 นาทียังถึง 38.0', value: 'repeatStillHigh' },
      { label: '38.0–38.9 °C วัดซ้ำแล้วลดลง', value: 'repeatLower' },
      { label: '38.0–38.9 °C ไม่ได้วัดซ้ำ', value: 'notRepeated' },
      { label: 'ไม่มีไข้', value: 'none' },
    ],
  },
  suspected: {
    kind: 'multi',
    title: 'มีข้อไหนบ้าง',
    hint: 'เลือกได้หลายข้อ',
    options: [
      { label: 'FHR baseline เกิน 160 นาน 10 นาทีขึ้นไป', value: 'fetalTachy' },
      { label: 'WBC แม่เกิน 15,000 โดยไม่ได้ steroid', value: 'matWbc' },
      { label: 'มีหนองออกจากปากมดลูก', value: 'purulent' },
    ],
    noneLabel: 'ไม่มีเลย',
  },
  confirmed: {
    kind: 'multi',
    title: 'มีผลตรวจข้อไหนบ้าง',
    hint: 'เลือกได้หลายข้อ',
    options: [
      { label: 'amniotic fluid Gram stain พบเชื้อ', value: 'gramStain' },
      { label: 'amniotic fluid glucose ต่ำ หรือ culture ขึ้น', value: 'afGlucoseCulture' },
      { label: 'placental pathology บอกว่าติดเชื้อ', value: 'placenta' },
    ],
    noneLabel: 'ไม่มี หรือยังไม่ได้ตรวจ',
  },
  iapIndications: {
    kind: 'multi',
    title: 'แม่มีข้อบ่งชี้ GBS IAP ข้อไหนบ้าง',
    hint: 'เลือกได้หลายข้อ',
    options: [
      { label: 'GBS bacteriuria ในครรภ์นี้', value: 'bacteriuria' },
      { label: 'ลูกคนก่อนเป็น invasive GBS', value: 'prevInfant' },
      { label: 'GBS culture บวกในครรภ์นี้', value: 'gbsPos' },
      { label: 'GA 35+0 ถึง 36+6 wk และเจ็บครรภ์จริงหรือถุงน้ำแตก', value: 'latePretermLabor' },
      { label: 'GA 37 wk ขึ้นไป และถุงน้ำแตก 18 ชม. ขึ้นไป', value: 'termRom18' },
    ],
    noneLabel: 'ไม่มีเลย',
  },
  adequateIap: {
    kind: 'choice',
    title: 'แม่ได้ penicillin, ampicillin หรือ cefazolin ตั้งแต่ 4 ชม. ก่อนคลอดไหม',
    options: [
      { label: 'ได้', value: true },
      { label: 'ไม่ได้', value: false },
      { label: 'ไม่ทราบ', value: null },
    ],
  },
};
