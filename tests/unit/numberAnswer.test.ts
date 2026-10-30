import { describe, expect, it } from 'vitest';
import { parseNumberAnswer } from '../../src/flow/numberAnswer';

describe('parseNumberAnswer', () => {
  it.each([
    ['38.2', 38.2],
    ['38', 38],
    [' 38.2 ', 38.2],
    ['037.5', 37.5],
    ['34', 34],
    ['42', 42],
    ['34.0', 34],
  ])('%j is %s', (raw, expected) => {
    expect(parseNumberAnswer(raw, 34, 42)).toBe(expected);
  });

  // A 30-minute ROM is often typed without the zero.
  it.each([
    ['.5', 0.5],
    [' .5 ', 0.5],
    ['.25', 0.25],
    ['0.5', 0.5],
  ])('%j is %s ROM hours', (raw, expected) => {
    expect(parseNumberAnswer(raw, 0, 240)).toBe(expected);
  });

  it.each([
    ['0x26', 'hexadecimal'],
    ['1e2', 'exponent'],
    ['3.8e1', 'exponent with a point'],
    ['', 'empty'],
    ['   ', 'blank'],
    ['38.', 'a trailing point'],
    ['.', 'a point alone'],
    ['..5', 'two points before the digits'],
    ['.5.', 'a point after a leading-point decimal'],
    ['.5e1', 'a leading point with an exponent'],
    ['-.5', 'a minus sign before a leading point'],
    ['37..', 'two points'],
    ['3 8', 'a space inside'],
    ['-38', 'a minus sign'],
    ['+38', 'a plus sign'],
    ['38,2', 'a comma'],
    ['Infinity', 'Infinity'],
    ['NaN', 'NaN'],
    ['๓๘', 'Thai digits'],
  ])('%j is refused (%s)', (raw) => {
    expect(parseNumberAnswer(raw, 0, 1000)).toBeNull();
  });

  it('refuses a value outside the range, and accepts both edges', () => {
    expect(parseNumberAnswer('33.9', 34, 42)).toBeNull();
    expect(parseNumberAnswer('42.1', 34, 42)).toBeNull();
    expect(parseNumberAnswer('0', 0, 240)).toBe(0);
    expect(parseNumberAnswer('240', 0, 240)).toBe(240);
    expect(parseNumberAnswer('240.5', 0, 240)).toBeNull();
  });

  it('refuses a number too long to be a real entry', () => {
    expect(parseNumberAnswer('9'.repeat(400), 0, 240)).toBeNull();
  });
});
