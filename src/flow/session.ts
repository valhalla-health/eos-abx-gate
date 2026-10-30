import type { AnswerKey, Answers, Override } from '../data/types';
import { nextStep, type Step } from './engine';

// Answers live in memory only; a reload or restart forgets them (SRS D1).
export class Session {
  answers: Answers = {};
  private history: AnswerKey[] = [];

  // A key answered again keeps its one history entry, so one back still undoes it.
  answer<K extends AnswerKey>(key: K, value: Answers[K]): void {
    this.answers = { ...this.answers, [key]: value };
    if (!this.history.includes(key)) this.history.push(key);
  }

  back(): void {
    const key = this.history.pop();
    const next: Answers = { ...this.answers };
    if (key) delete next[key];
    delete next.override;
    this.answers = next;
  }

  canGoBack(): boolean {
    return this.history.length > 0;
  }

  restart(): void {
    this.answers = {};
    this.history = [];
  }

  setOverride(o: Override): void {
    this.answers = { ...this.answers, override: o };
  }

  step(): Step {
    return nextStep(this.answers);
  }
}
