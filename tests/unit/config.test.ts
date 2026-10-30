import { describe, expect, it } from 'vitest';
import { APP_VERSION, DEFINITIONS_STATUS, INCIDENCE_PER_1000 } from '../../src/data/config';

describe('config', () => {
  it('uses the CDC incidence until KCMH has its own (SRS D5)', () => {
    expect(INCIDENCE_PER_1000).toBe(0.5);
  });
  it('marks the definitions as a draft', () => {
    expect(DEFINITIONS_STATUS).toContain('draft');
    expect(APP_VERSION).toBe('0.1.0');
  });
});
