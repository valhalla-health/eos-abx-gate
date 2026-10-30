import type { Action } from '../data/types';

// How strongly the result banner speaks. Grouping actions by what they mean for the baby is a clinical
// call, so it lives here; the screen only turns a tone into a colour class. Antibiotics now is crit,
// a culture with antibiotics held is warn, no antibiotics is ok, and the screens that give no
// recommendation are neutral. The headline always says the action in words as well.
export type Tone = 'crit' | 'warn' | 'ok' | 'neutral';

const TONE: Record<Action, Tone> = {
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

export function actionTone(action: Action): Tone {
  return TONE[action];
}
