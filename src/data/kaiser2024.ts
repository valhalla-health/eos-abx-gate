// Kaiser Permanente Neonatal EOS Calculator, 2024 model.
// Source: https://neonatalsepsiscalculator.kaiserpermanente.org/ModelUpdateFAQ.aspx (read 2026-10-29)
// and Kuzniewicz et al., Pediatrics 2024;154(4), doi:10.1542/peds.2023-065267.
export const COEF = {
  tempF: 0.85194656,
  ga: -7.72247124,
  gaSq: 0.09842383,
  rom: 0.86770862,
  abx1: -2.13142945,
  abx2: -2.33985917,
  gbsPos: 1.02265353,
  gbsUnknown: 1.13710111,
} as const;

export const BASE_INTERCEPT = 57.29929499; // KPNC incidence
export const KPNC_RATE = 0.0002763;

// The values the official site uses in 2024 mode (its incidence list, read 2026-10-29),
// keyed by String(incidence per 1000).
export const SITE_INTERCEPTS: Readonly<Record<string, number>> = {
  '0.05': 55.6,
  '0.1': 56.3,
  '0.2': 57.0,
  '0.27': 57.3,
  '0.3': 57.4,
  '0.4': 57.7,
  '0.5': 57.9,
  '0.6': 58.1,
  '0.7': 58.2,
  '0.8': 58.4,
  '0.9': 58.5,
  '1': 58.6,
  '2': 59.3,
  '4': 60.0,
  '5': 60.2,
};

export const LR = { clinicalIllness: 14.5, equivocal: 3.65, well: 0.36 } as const;
