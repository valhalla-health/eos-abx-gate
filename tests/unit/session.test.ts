import { describe, expect, it } from 'vitest';
import { Session } from '../../src/flow/session';

describe('Session', () => {
  it('records an answer and moves to the next step', () => {
    const s = new Session();
    s.answer('gaWeeks', 38);
    expect(s.step()).toEqual({ kind: 'question', key: 'resp' });
  });

  it('back removes only the last answer', () => {
    const s = new Session();
    s.answer('gaWeeks', 38);
    s.answer('resp', 'cpap');
    s.back();
    expect(s.answers).toEqual({ gaWeeks: 38 });
    expect(s.canGoBack()).toBe(true);
    s.back();
    expect(s.canGoBack()).toBe(false);
  });

  it('back from the result also clears an override', () => {
    const s = new Session();
    s.answer('gaWeeks', 34);
    s.setOverride({ reason: 'staffOrder', otherText: '', staff: 'อ.ทดสอบ' });
    s.back();
    expect(s.answers.override).toBeUndefined();
  });

  it('re-answering a key keeps one history entry, so one back undoes it', () => {
    const s = new Session();
    s.answer('gaWeeks', 38);
    s.answer('gaWeeks', 39);
    expect(s.answers).toEqual({ gaWeeks: 39 });
    s.back();
    expect(s.answers).toEqual({});
    expect(s.canGoBack()).toBe(false);
  });

  it('answer() takes only the value type of its key (tsc checks this in npm run build)', () => {
    const typeCheckOnly = (s: Session) => {
      // @ts-expect-error gaWeeks takes a number, not a respiratory-support value
      s.answer('gaWeeks', 'cpap');
    };
    expect(typeCheckOnly).toBeTypeOf('function');
  });

  it('restart clears everything', () => {
    const s = new Session();
    s.answer('gaWeeks', 38);
    s.restart();
    expect(s.answers).toEqual({});
    expect(s.canGoBack()).toBe(false);
  });
});
