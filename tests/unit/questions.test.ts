import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../../src/data/questions';

describe('QUESTIONS', () => {
  it('shows the equivocal thresholds from SRS 4.1', () => {
    const q = QUESTIONS.equivParams;
    if (q.kind !== 'multi') throw new Error('equivParams must be multi-select');
    const labels = q.options.map((o) => o.label).join(' | ');
    expect(labels).toContain('HR 160 ขึ้นไป');
    expect(labels).toContain('RR 60 ขึ้นไป');
    expect(labels).toContain('38.0 °C ขึ้นไป');
    expect(labels).toContain('ต่ำกว่า 36.5 °C');
  });

  // Pp, 2026-10-29: only continuous time counts, so the signs screen asks for 2 h without a break.
  it('the signs screen asks for signs continuous for 2 h, and intermittent ones do not count', () => {
    const q = QUESTIONS.equivParams;
    expect(q.title).toBe('ตั้งแต่ออกจากห้องคลอด มีข้อไหนเป็นต่อเนื่องนาน 2 ชม. ขึ้นไป');
    expect(q.hint).toBe('เลือกได้หลายข้อ เป็น ๆ หาย ๆ ไม่นับ');
    if (q.kind !== 'multi') throw new Error('equivParams must be multi-select');
    expect(q.options.map((o) => o.value)).toEqual(['hr', 'rr', 'temp', 'resp']);
    expect(q.noneLabel).toBe('ไม่มีเลย');
  });

  it('one sign: the 4 h question asks about continuous time, with no hint', () => {
    const q = QUESTIONS.oneParamGe4h;
    expect(q.title).toBe('ข้อนี้เป็นต่อเนื่องนานถึง 4 ชม. หรือยัง');
    expect(q.hint).toBeUndefined();
    if (q.kind !== 'choice') throw new Error('oneParamGe4h must be choice');
    expect(q.options).toEqual([
      { label: 'ถึงแล้ว', value: true },
      { label: 'ยังไม่ถึง', value: false },
    ]);
  });

  it('two or more signs have no duration question of their own', () => {
    expect(Object.keys(QUESTIONS)).not.toContain('twoParamsGe2h');
    expect(Object.keys(QUESTIONS)).not.toContain('anyParamGe4h');
  });

  it('the broad-spectrum list sits behind a closed details, one rule per line', () => {
    const q = QUESTIONS.matAbx;
    expect(q.hint).toBeUndefined();
    expect(q.more?.summary).toBe('ดูรายชื่อยา broad-spectrum');
    expect(q.more?.lines).toEqual([
      'penicillin, ampicillin หรือ cefazolin ร่วมกับ aminoglycoside (เช่น gentamicin), aztreonam, azithromycin หรือ metronidazole',
      'cephalosporin รุ่น 2 ถึง 4, extended-spectrum penicillin, fluoroquinolone, carbapenem, tetracycline หรือ TMP-SMX ตัวเดียวก็นับเป็น broad-spectrum',
      'ampicillin ร่วมกับ erythromycin ให้นับเป็น penicillin, ampicillin หรือ cefazolin อย่างเดียว',
      'ได้หลายตัว ให้เลือกตัวที่กว้างที่สุดที่ให้ครบ',
    ]);
    // SRS 4.2: every partner drug and every class that counts on its own is named.
    const all = q.more?.lines.join(' ') ?? '';
    for (const drug of ['aminoglycoside', 'aztreonam', 'azithromycin', 'metronidazole', 'cephalosporin รุ่น 2 ถึง 4', 'extended-spectrum penicillin', 'fluoroquinolone', 'carbapenem', 'tetracycline', 'TMP-SMX']) {
      expect(all).toContain(drug);
    }
    expect(all).not.toContain('ยาอื่น');
  });

  it('every hint is one short line; a longer text goes behind details', () => {
    for (const [key, q] of Object.entries(QUESTIONS)) {
      if (q.hint) expect(q.hint.length, key).toBeLessThanOrEqual(80);
    }
  });

  it('ROM hours take the Kaiser site range, 0 to 240 h', () => {
    const q = QUESTIONS.romHours;
    if (q.kind !== 'number') throw new Error('romHours must be a number');
    expect([q.min, q.max]).toEqual([0, 240]);
  });

  it('the ROM screen tells the resident to press "ไม่ทราบ" above 240 h instead of typing 240', () => {
    const q = QUESTIONS.romHours;
    expect(q.hint).toBe('ถ้านานกว่า 240 ชม. กดไม่ทราบ');
    if (q.kind !== 'number') throw new Error('romHours must be a number');
    expect(q.noValueLabel).toBe('ไม่ทราบ');
  });

  it('asks GA 35 to 42 plus below 35', () => {
    const q = QUESTIONS.gaWeeks;
    if (q.kind !== 'choice') throw new Error('gaWeeks must be choice');
    expect(q.options.map((o) => o.value)).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42]);
  });

  it('no two options on one screen share a label', () => {
    for (const [key, q] of Object.entries(QUESTIONS)) {
      const labels = q.kind === 'choice' ? q.options.map((o) => o.label) : q.kind === 'multi' ? [...q.options.map((o) => o.label), q.noneLabel] : [q.noValueLabel];
      expect(new Set(labels).size, key).toBe(labels.length);
    }
  });
});
