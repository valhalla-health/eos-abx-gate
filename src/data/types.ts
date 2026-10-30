export type RespSupport = 'none' | 'o2' | 'cpap';
export type GbsStatus = 'pos' | 'neg' | 'unk';
export type MatAbx = 'none' | 'gbsSpecific' | 'broad' | 'notCounted';
export type AbxTiming = 'ge4' | '2to4' | 'lt2' | 'unknown';
export type Fever = 'ge39' | 'repeatStillHigh' | 'repeatLower' | 'notRepeated' | 'none';
export type EquivParam = 'hr' | 'rr' | 'temp' | 'resp';
export type SuspectedCriterion = 'fetalTachy' | 'matWbc' | 'purulent';
export type ConfirmedCriterion = 'gramStain' | 'afGlucoseCulture' | 'placenta';
export type IapIndication = 'bacteriuria' | 'prevInfant' | 'gbsPos' | 'latePretermLabor' | 'termRom18';

export interface Override {
  reason: 'staffOrder' | 'motherSevere' | 'other';
  otherText: string;
  staff: string;
}

export interface Answers {
  gaWeeks?: number; // 34 stands for "below 35"
  resp?: RespSupport;
  o2Needed?: boolean;
  o2Ge2h?: boolean;
  vasoOrBolus?: boolean;
  seizure?: boolean;
  apgar5Below5?: boolean;
  apnea?: boolean;
  poorFeeding?: boolean;
  poorFeedingStaffChecked?: boolean;
  lethargy?: boolean;
  lethargyStaffChecked?: boolean;
  equivParams?: EquivParam[]; // only signs continuous for 2 h or more (SRS 4.1)
  oneParamGe4h?: boolean; // asked only when one sign is ticked
  gaDays?: number | null; // null = unknown
  tmaxC?: number | null; // null = no value recorded
  romHours?: number | null; // null = unknown
  gbs?: GbsStatus;
  matAbx?: MatAbx;
  abxTiming?: AbxTiming;
  fever?: Fever;
  suspected?: SuspectedCriterion[];
  confirmed?: ConfirmedCriterion[];
  iapIndications?: IapIndication[];
  adequateIap?: boolean | null; // null = unknown
  override?: Override;
}

export type AnswerKey = Exclude<keyof Answers, 'override'>;

export type Category = 'outOfScope' | 'clinicalIllness' | 'equivocal' | 'well';
export type ReasonCode =
  | 'gaBelow35'
  | 'cpap'
  | 'o2Ge2h'
  | 'vasoOrBolus'
  | 'seizure'
  | 'apgar'
  | 'apnea'
  | 'poorFeeding'
  | 'lethargy'
  | 'oneParam4h'
  | 'twoParams2h'
  | 'noSigns'
  | 'signsTooShort';
export type Recheck = 'o2At2h' | 'signsAt2h' | 'signsAt4h';

export interface Classification {
  category: Category;
  reason: ReasonCode;
  rechecks: Recheck[];
}

export type Action =
  | 'outOfScope'
  | 'abx'
  | 'observe'
  | 'cultureNoAbx'
  | 'cultureAbx'
  | 'kaiserUnavailable'
  | 'incomplete'
  | 'serial48to72'
  | 'routine';

export type WellPath =
  | 'confirmedTripleI'
  | 'suspectedTripleI'
  | 'isolatedFever'
  | 'noIapIndication'
  | 'adequateIap'
  | 'inadequateIap';

export interface Result {
  classification: Classification;
  action: Action;
  kaiser?: { atBirth: number; afterExam: number };
  wellPath?: WellPath;
}
