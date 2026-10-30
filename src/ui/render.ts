import { INCIDENCE_PER_1000 } from '../data/config';
import { QUESTIONS } from '../data/questions';
import { FOOTER, NEED_STAFF_TH, OVERRIDE_TH, RESULT_TH, START_TH, UI_TH } from '../data/text';
import type { AnswerKey, Answers, Override } from '../data/types';
import { parseNumberAnswer } from '../flow/numberAnswer';
import type { Session } from '../flow/session';
import { allowedEquivParams, effectiveParams } from '../logic/classify';
import { formatPer1000 } from '../logic/kaiser';
import { recommend } from '../logic/recommend';
import { summaryText } from '../logic/summary';
import { actionTone } from '../logic/tone';

// A new screen ignores taps for this long, so the second tap of a double tap
// cannot answer the next question before it has been read.
const ARM_DELAY_MS = 300;

export interface View {
  root: HTMLElement;
  session: Session;
  started: boolean;
  overrideOpen: boolean;
  now: () => Date;
  rendered?: boolean; // set by render() after the first screen of the page load
}

function h(tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

// A plain answer button takes the bare `button` rule in styles.css (a white card). `primary` is the
// filled orange button; `quiet` is a small text-style one.
function button(label: string, onClick: () => void, cls?: 'primary' | 'quiet'): HTMLButtonElement {
  const b = h('button', cls ? { type: 'button', class: cls } : { type: 'button' }, label) as HTMLButtonElement;
  b.addEventListener('click', onClick);
  return b;
}

function heading(text: string): HTMLElement {
  return h('h1', { tabindex: '-1' }, text);
}

// A screen's own rule for which of its buttons work, run again when arming ends.
type Sync = () => void;

export function render(v: View): void {
  const sync = draw(v);
  armControls(v.root, sync);
  if (v.rendered) {
    window.scrollTo(0, 0);
    v.root.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }
  v.rendered = true;
}

// Disables every control that is enabled now and re-enables exactly those after
// ARM_DELAY_MS. A control disabled for its own reason (multi-select ต่อไป) is not
// in the list, so it keeps its state. The list belongs to this render: a timer from
// an earlier render only touches that screen's detached elements.
function armControls(root: HTMLElement, sync?: Sync): void {
  const armed = Array.from(root.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input')).filter((el) => !el.disabled);
  for (const el of armed) {
    el.disabled = true;
    el.classList.add('arming');
  }
  setTimeout(() => {
    for (const el of armed) {
      el.disabled = false;
      el.classList.remove('arming');
    }
    // Invariant: "none" is disabled while a box is ticked, and "no value" while the number box holds
    // text. Blind re-enabling could break it, so the screen's own rule runs last.
    sync?.();
  }, ARM_DELAY_MS);
}

function draw(v: View): Sync | undefined {
  v.root.replaceChildren();
  if (!v.started) {
    v.root.append(startScreen(v), footer());
    return undefined;
  }
  if (v.overrideOpen) {
    v.root.append(overrideScreen(v), footer());
    return undefined;
  }
  const step = v.session.step();
  let sync: Sync | undefined;
  if (step.kind === 'question') {
    const q = questionScreen(v, step.key);
    v.root.append(q.el);
    sync = q.sync;
  } else if (step.kind === 'needStaff') v.root.append(h('section', { class: 'screen' }, heading(NEED_STAFF_TH), nav(v)));
  else v.root.append(resultScreen(v));
  v.root.append(footer());
  return sync;
}

function pill(...children: (Node | string)[]): HTMLElement {
  return h('span', { class: 'pill' }, ...children);
}

// A risk per 1000, in the tabular mono face.
function per1000(risk: number): HTMLElement {
  return h('span', { class: 'num' }, `${formatPer1000(risk)}/1000`);
}

// The banner line breaks at its " · " marks first, so a step such as "empiric ABX" stays together.
function steps(line: string): (Node | string)[] {
  return line.split(' · ').flatMap((step, i) => [...(i > 0 ? [' · '] : []), h('span', { class: 'step' }, step)]);
}

// A closed <details>: the browser opens and closes it, so it needs no script under the CSP.
function more(summary: string, ...children: (Node | string)[]): HTMLDetailsElement {
  return h('details', {}, h('summary', {}, summary), h('div', { class: 'more' }, ...children)) as HTMLDetailsElement;
}

function startScreen(v: View): HTMLElement {
  return h(
    'section',
    { class: 'screen start' },
    heading(START_TH.title),
    h('p', {}, START_TH.body),
    h('div', { class: 'pills' }, ...START_TH.limits.map((t) => pill(t))),
    button(START_TH.go, () => {
      v.started = true;
      render(v);
    }, 'primary'),
  );
}

// The 4 h question is about the one sign ticked on the screen before, so it names that sign (Pp, 2026-10-30).
function oneSignLabel(a: Answers): string | undefined {
  const q = QUESTIONS.equivParams;
  const [sign] = effectiveParams(a);
  return q.kind === 'multi' ? q.options.find((o) => o.value === sign)?.label : undefined;
}

function questionScreen(v: View, key: AnswerKey): { el: HTMLElement; sync?: Sync } {
  const q = QUESTIONS[key];
  const s = h('section', { class: 'screen' }, heading(q.title));
  if (q.hint) s.append(h('p', { class: 'hint' }, q.hint));
  const sign = key === 'oneParamGe4h' ? oneSignLabel(v.session.answers) : undefined;
  if (sign) s.append(h('p', { class: 'sign' }, sign));
  if (q.more) s.append(more(q.more.summary, h('ul', {}, ...q.more.lines.map((line) => h('li', {}, line)))));
  const commit = (value: Answers[AnswerKey]) => {
    v.session.answer(key, value);
    render(v);
  };

  let sync: Sync | undefined;
  if (q.kind === 'choice') {
    for (const o of q.options) s.append(button(o.label, () => commit(o.value as Answers[AnswerKey])));
  } else if (q.kind === 'multi') {
    const allowed = key === 'equivParams' ? new Set<string>(allowedEquivParams(v.session.answers)) : null;
    const boxes: HTMLInputElement[] = [];
    for (const o of q.options) {
      if (allowed && !allowed.has(o.value)) continue;
      const box = h('input', { type: 'checkbox', value: o.value }) as HTMLInputElement;
      boxes.push(box);
      s.append(h('label', { class: 'check' }, box, h('span', {}, o.label)));
    }
    const next = button(UI_TH.next, () => commit(boxes.filter((b) => b.checked).map((b) => b.value) as Answers[AnswerKey]), 'primary');
    const none = button(q.noneLabel, () => commit([]));
    next.disabled = true;
    // A checked box and "none" contradict each other, so only one of the two buttons works at a time.
    sync = () => {
      const anyChecked = boxes.some((x) => x.checked);
      next.disabled = !anyChecked;
      none.disabled = anyChecked;
    };
    for (const b of boxes) b.addEventListener('change', sync);
    s.append(next, none);
  } else {
    // type=text, not number: a mouse wheel or an arrow key cannot change the value, and the field
    // shows exactly what was typed (a number field reads an unparseable entry as empty).
    const input = h('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      'aria-label': q.title,
    }) as HTMLInputElement;
    const error = h('p', { class: 'error', role: 'alert' });
    const submit = () => {
      const n = parseNumberAnswer(input.value, q.min, q.max);
      if (n === null) {
        error.textContent = UI_TH.range(q.min, q.max);
        return;
      }
      commit(n);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    // A typed entry and "no value" contradict each other: the box must be empty to pick no value.
    // Any text counts, even one that does not parse, since the resident is still typing a number.
    const noValue = button(q.noValueLabel, () => commit(null));
    sync = () => {
      noValue.disabled = input.value.trim() !== '';
    };
    input.addEventListener('input', sync);
    s.append(h('div', { class: 'number' }, input, h('span', {}, q.unit)), error, button(UI_TH.next, submit, 'primary'), noValue);
  }
  s.append(nav(v));
  return { el: s, sync };
}

// Top to bottom (Pp, 2026-10-29): the decision, a line of pills, re-checks, copy, then the reasons and
// the note behind a closed <details>, so the answer is readable at a glance.
function resultScreen(v: View): HTMLElement {
  const a = v.session.answers;
  const r = recommend(a, INCIDENCE_PER_1000);
  const { category, reason, rechecks } = r.classification;
  const text = RESULT_TH.action[r.action];
  const s = h(
    'section',
    { class: 'screen result' },
    h('div', { class: `banner tone-${actionTone(r.action)}` }, heading(text.headline), h('p', {}, ...steps(text.line))),
  );
  const pills = h('div', { class: 'pills' });
  if (category !== 'outOfScope') pills.append(pill(RESULT_TH.category[category]));
  if (r.kaiser) pills.append(pill(`${RESULT_TH.kaiserPill} `, per1000(r.kaiser.afterExam)));
  if (pills.childElementCount > 0) s.append(pills);
  for (const rc of rechecks) s.append(h('p', { class: 'recheck' }, RESULT_TH.recheck[rc]));

  const pre = h('pre', { 'data-testid': 'summary' }, summaryText(a, r, v.now(), INCIDENCE_PER_1000));
  const status = h('p', { class: 'status', role: 'status' });
  const lines = [h('p', {}, RESULT_TH.reason[reason])];
  if (r.wellPath) lines.push(h('p', {}, RESULT_TH.wellPath[r.wellPath]));
  if (r.kaiser) {
    lines.push(
      h(
        'div',
        { class: 'kaiser' },
        h('p', {}, RESULT_TH.kaiser.model(INCIDENCE_PER_1000)),
        h(
          'dl',
          {},
          h('dt', {}, RESULT_TH.kaiser.atBirth),
          h('dd', {}, per1000(r.kaiser.atBirth)),
          h('dt', {}, RESULT_TH.kaiser.afterExam),
          h('dd', {}, per1000(r.kaiser.afterExam)),
        ),
      ),
    );
  }
  const why = more(UI_TH.why, ...lines, pre);
  s.append(
    button(UI_TH.copy, () => {
      // The note's time stamp is the time of the copy, not of the screen (SRS section 5).
      const note = summaryText(a, r, v.now(), INCIDENCE_PER_1000);
      pre.textContent = note;
      void copy(note, why, pre, status);
    }, 'primary'),
    status,
    why,
  );
  // Below 35 weeks the page gives no recommendation, so there is nothing to differ from.
  if (r.action !== 'outOfScope') {
    s.append(
      button(UI_TH.override, () => {
        v.overrideOpen = true;
        render(v);
      }, 'quiet'),
    );
  }
  s.append(nav(v));
  return s;
}

// The copy button copies without showing the note. When the clipboard is refused, the note is shown
// and selected, so Ctrl+C works.
async function copy(text: string, why: HTMLDetailsElement, pre: HTMLElement, status: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = UI_TH.copied;
  } catch {
    why.open = true;
    const range = document.createRange();
    range.selectNodeContents(pre);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    status.textContent = UI_TH.copyManually;
  }
}

function overrideScreen(v: View): HTMLElement {
  const s = h('section', { class: 'screen' }, heading(OVERRIDE_TH.title));
  const reasons = ['staffOrder', 'motherSevere', 'other'] as const;
  const radios = reasons.map((value) => {
    const r = h('input', { type: 'radio', name: 'reason', value }) as HTMLInputElement;
    s.append(h('label', { class: 'check' }, r, h('span', {}, OVERRIDE_TH.reasons[value])));
    return r;
  });
  // autocomplete off: a shared ward PC must not offer the last resident's text to the next one.
  const textBox = (label: string, maxlength: string) =>
    h('input', { type: 'text', 'aria-label': label, placeholder: label, maxlength, autocomplete: 'off' }) as HTMLInputElement;
  const other = textBox(OVERRIDE_TH.otherText, '80');
  const staff = textBox(OVERRIDE_TH.staff, '60');
  const error = h('p', { class: 'error', role: 'alert' });
  s.append(
    other,
    staff,
    error,
    button(OVERRIDE_TH.save, () => {
      const picked = radios.find((r) => r.checked)?.value as Override['reason'] | undefined;
      if (!picked || staff.value.trim() === '' || (picked === 'other' && other.value.trim() === '')) {
        error.textContent = OVERRIDE_TH.missing;
        return;
      }
      v.session.setOverride({ reason: picked, otherText: other.value.trim(), staff: staff.value.trim() });
      v.overrideOpen = false;
      render(v);
    }, 'primary'),
    button(OVERRIDE_TH.cancel, () => {
      v.overrideOpen = false;
      render(v);
    }),
  );
  return s;
}

function nav(v: View): HTMLElement {
  return h(
    'div',
    { class: 'nav' },
    button(UI_TH.back, () => {
      if (v.session.canGoBack()) v.session.back();
      else v.started = false;
      render(v);
    }),
    button(UI_TH.restart, () => {
      v.session.restart();
      v.started = false;
      render(v);
    }),
  );
}

function footer(): HTMLElement {
  const link = h(
    'a',
    { href: 'https://neonatalsepsiscalculator.kaiserpermanente.org/', rel: 'noopener noreferrer', target: '_blank', title: FOOTER.kaiserName },
    FOOTER.kaiserLink,
  );
  // Each item keeps its trailing " ·" and moves to the next line whole, so a line never starts with a
  // dot and a Thai phrase is never split.
  const items: (Node | string)[] = [link, ...FOOTER.items];
  return h(
    'footer',
    {},
    ...items.flatMap((item, i) => (i < items.length - 1 ? [h('span', { class: 'item' }, item, ' ·'), ' '] : [h('span', { class: 'item' }, item)])),
  );
}
