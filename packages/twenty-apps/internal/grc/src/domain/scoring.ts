export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Select values are stored as "L3" / "I4"; the digit is the 1-5 rating.
export const ratingOf = (value: string | null | undefined): number | null => {
  const rating = Number(value?.slice(1));

  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
};

export const levelForScore = (score: number): RiskLevel => {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';

  return 'LOW';
};

export const scoreRisk = (
  likelihood: string | null | undefined,
  impact: string | null | undefined,
): { score: number; level: RiskLevel } | null => {
  const likelihoodRating = ratingOf(likelihood);
  const impactRating = ratingOf(impact);

  if (likelihoodRating === null || impactRating === null) {
    return null;
  }

  const score = likelihoodRating * impactRating;

  return { score, level: levelForScore(score) };
};

export type VendorIntake = {
  criticality?: string | null;
  dataClassification?: string | null;
  systemAccess?: string | null;
  dataTypes?: string[] | null;
};

const CRITICALITY_POINTS: Record<string, number> = {
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};
const DATA_POINTS: Record<string, number> = {
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};
const ACCESS_POINTS: Record<string, number> = { LIMITED: 1, PRIVILEGED: 3 };
const REGULATED_DATA_TYPES = ['PHI', 'PCI', 'CREDENTIALS'];

export const TIER_BY_LEVEL: Record<RiskLevel, string> = {
  CRITICAL: 'TIER_1',
  HIGH: 'TIER_2',
  MEDIUM: 'TIER_3',
  LOW: 'TIER_4',
};

export const inherentVendorRisk = (intake: VendorIntake): RiskLevel => {
  const handlesRegulatedData = (intake.dataTypes ?? []).some((dataType) =>
    REGULATED_DATA_TYPES.includes(dataType),
  );
  const points =
    (CRITICALITY_POINTS[intake.criticality ?? ''] ?? 0) +
    (DATA_POINTS[intake.dataClassification ?? ''] ?? 0) +
    (ACCESS_POINTS[intake.systemAccess ?? ''] ?? 0) +
    (handlesRegulatedData ? 1 : 0);

  if (points >= 7) return 'CRITICAL';
  if (points >= 5) return 'HIGH';
  if (points >= 3) return 'MEDIUM';

  return 'LOW';
};

export type AnswerValue =
  | 'YES'
  | 'PARTIAL'
  | 'NO'
  | 'NOT_APPLICABLE'
  | 'UNANSWERED';

const ANSWER_CREDIT: Partial<Record<AnswerValue, number>> = {
  YES: 1,
  PARTIAL: 0.5,
  NO: 0,
};

export const scoreAssessment = (
  responses: { answer: string; weight?: number | null }[],
) => {
  let earned = 0;
  let possible = 0;
  let answered = 0;

  for (const response of responses) {
    if (response.answer !== 'UNANSWERED') answered++;

    const credit = ANSWER_CREDIT[response.answer as AnswerValue];

    if (credit === undefined) continue;

    const weight = response.weight ?? 1;

    earned += credit * weight;
    possible += weight;
  }

  return {
    answered,
    total: responses.length,
    score: possible > 0 ? Math.round((earned / possible) * 100) : null,
  };
};

// A strong questionnaire lowers the inherent rating by up to two levels; a
// weak one raises it, so a low-inherent vendor with poor answers still surfaces.
export const residualVendorRisk = (
  inherent: RiskLevel,
  score: number,
): RiskLevel => {
  const shift = score >= 85 ? -2 : score >= 70 ? -1 : score >= 50 ? 0 : 1;
  const index = RISK_LEVELS.indexOf(inherent) + shift;

  return RISK_LEVELS[Math.min(RISK_LEVELS.length - 1, Math.max(0, index))];
};

export type ControlPosture = { status: string; effectiveness: string };

export const complianceFromControls = (controls: ControlPosture[]): string => {
  const active = controls.filter((control) => control.status !== 'RETIRED');

  if (active.length === 0) return 'NOT_ASSESSED';

  const isProven = (control: ControlPosture) =>
    control.status === 'OPERATIONAL' && control.effectiveness === 'EFFECTIVE';
  const isFailing = (control: ControlPosture) =>
    control.effectiveness === 'INEFFECTIVE' || control.status === 'DRAFT';

  if (active.every(isProven)) return 'COMPLIANT';
  if (active.every(isFailing)) return 'NON_COMPLIANT';

  return 'PARTIALLY_COMPLIANT';
};
