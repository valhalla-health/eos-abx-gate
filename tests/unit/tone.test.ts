import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/data/types';
import { actionTone, type Tone } from '../../src/logic/tone';

// Every Action, including incomplete, which the page never reaches but which must not fall through.
const EXPECTED: Record<Action, Tone> = {
  abx: 'crit',
  cultureAbx: 'crit',
  cultureNoAbx: 'warn',
  observe: 'ok',
  serial48to72: 'ok',
  routine: 'ok',
  kaiserUnavailable: 'neutral',
  outOfScope: 'neutral',
  incomplete: 'neutral',
};

describe('actionTone', () => {
  it.each(Object.entries(EXPECTED) as [Action, Tone][])('%s → %s', (action, tone) => {
    expect(actionTone(action)).toBe(tone);
  });

  it('only the two antibiotic actions are crit', () => {
    const crit = (Object.keys(EXPECTED) as Action[]).filter((a) => actionTone(a) === 'crit');
    expect(crit.sort()).toEqual(['abx', 'cultureAbx']);
  });
});
