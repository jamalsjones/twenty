import { randomBytes } from 'node:crypto';

import {
  residualVendorRisk,
  type RiskLevel,
  scoreAssessment,
} from '../../domain/scoring';
import {
  addDays,
  createRecord,
  createRecords,
  findRecord,
  listRecords,
  today,
  updateRecord,
} from './records';

type Vendor = {
  id: string;
  name: string;
  inherentRisk: RiskLevel | null;
  tier: string | null;
};
type Framework = { id: string; name: string };
type Requirement = {
  refId: string | null;
  section: string | null;
  statement: string | null;
  sortOrder: number | null;
};
export type AssessmentRecord = {
  id: string;
  name: string;
  stage: string;
  vendorId: string | null;
  portalToken: string | null;
};
export type ResponseRecord = {
  id: string;
  name: string;
  section: string | null;
  question: string | null;
  answer: string;
  comment: string | null;
  weight: number | null;
  sortOrder: number | null;
};

const DUE_IN_DAYS = 21;
const REVIEW_INTERVAL_DAYS: Record<string, number> = {
  TIER_1: 180,
  TIER_2: 365,
  TIER_3: 730,
  TIER_4: 1095,
};

export const launchAssessment = async (
  vendorId: string,
  ownerId?: string | null,
) => {
  const vendor = await findRecord<Vendor>('vendors', `id[eq]:"${vendorId}"`);

  if (!vendor) throw new Error('Vendor not found');

  const questionnaire = await findRecord<Framework>(
    'frameworks',
    'kind[eq]:QUESTIONNAIRE',
  );

  if (!questionnaire) {
    throw new Error(
      'Import a vendor questionnaire before starting assessments',
    );
  }

  const questions = (
    await listRecords<Requirement>(
      'requirements',
      `and(frameworkId[eq]:"${questionnaire.id}",assessable[eq]:true)`,
    )
  ).sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

  const assessment = await createRecord<AssessmentRecord>('vendorAssessments', {
    name: `${vendor.name} due diligence ${today().slice(0, 7)}`,
    vendorId,
    questionnaireId: questionnaire.id,
    stage: 'SCOPING',
    assessmentType: 'ONBOARDING',
    dueDate: addDays(today(), DUE_IN_DAYS),
    questionCount: questions.length,
    answeredCount: 0,
    portalToken: randomBytes(24).toString('base64url'),
    ...(ownerId ? { ownerId } : {}),
  });

  await createRecords(
    'assessmentResponses',
    questions.map((question, index) => ({
      name: question.refId ?? `Q${index + 1}`,
      assessmentId: assessment.id,
      section: question.section,
      question: question.statement,
      answer: 'UNANSWERED',
      verdict: 'PENDING',
      weight: 1,
      sortOrder: index,
    })),
  );

  await updateRecord('vendors', vendorId, { status: 'DUE_DILIGENCE' });

  return { assessmentId: assessment.id, questionCount: questions.length };
};

export const loadResponses = async (assessmentId: string) =>
  (
    await listRecords<ResponseRecord>(
      'assessmentResponses',
      `assessmentId[eq]:"${assessmentId}"`,
    )
  ).sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

export const refreshAssessmentScore = async (assessmentId: string) => {
  const result = scoreAssessment(await loadResponses(assessmentId));

  await updateRecord('vendorAssessments', assessmentId, {
    score: result.score,
    answeredCount: result.answered,
    questionCount: result.total,
  });

  return result;
};

type Decision = 'APPROVED' | 'REMEDIATION' | 'REJECTED';

const VENDOR_STATUS_BY_DECISION: Record<Decision, string> = {
  APPROVED: 'APPROVED',
  REMEDIATION: 'CONDITIONAL',
  REJECTED: 'REJECTED',
};

export const completeAssessment = async (
  assessmentId: string,
  decision: Decision,
) => {
  const assessment = await findRecord<AssessmentRecord>(
    'vendorAssessments',
    `id[eq]:"${assessmentId}"`,
  );

  if (!assessment?.vendorId) throw new Error('Assessment not found');

  const vendor = await findRecord<Vendor>(
    'vendors',
    `id[eq]:"${assessment.vendorId}"`,
  );
  const responses = await loadResponses(assessmentId);
  const { score } = scoreAssessment(responses);
  const riskRating = residualVendorRisk(
    vendor?.inherentRisk ?? 'MEDIUM',
    score ?? 0,
  );

  await updateRecord('vendorAssessments', assessmentId, {
    stage: decision,
    score,
    riskRating,
    completedAt: today(),
  });
  await updateRecord('vendors', assessment.vendorId, {
    status: VENDOR_STATUS_BY_DECISION[decision],
    securityScore: score,
    residualRisk: riskRating,
    lastAssessedAt: today(),
    nextReviewDate: addDays(
      today(),
      REVIEW_INTERVAL_DAYS[vendor?.tier ?? 'TIER_3'],
    ),
  });

  const gaps =
    decision === 'APPROVED'
      ? []
      : responses.filter((response) => response.answer === 'NO');

  await createRecords(
    'findings',
    gaps.map((response) => ({
      name: `${vendor?.name}: ${response.name} not met`,
      details: response.question,
      source: 'VENDOR_ASSESSMENT',
      severity: riskRating === 'LOW' ? 'MEDIUM' : riskRating,
      status: 'OPEN',
      dueDate: addDays(today(), 45),
      vendorId: assessment.vendorId,
      assessmentId,
    })),
  );

  return { score, riskRating, findingsRaised: gaps.length };
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

export const findAssessmentByToken = async (token: string | undefined) =>
  token && TOKEN_PATTERN.test(token)
    ? findRecord<AssessmentRecord>(
        'vendorAssessments',
        `portalToken[eq]:"${token}"`,
      )
    : undefined;
