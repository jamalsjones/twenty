import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';
import {
  findAssessmentByToken,
  loadResponses,
  refreshAssessmentScore,
} from './shared/assessments';
import { updateRecord, updateRecords } from './shared/records';

type SubmittedAnswer = { id?: string; answer?: string; comment?: string };

const ACCEPTED_ANSWERS = [
  'YES',
  'PARTIAL',
  'NO',
  'NOT_APPLICABLE',
  'UNANSWERED',
];
const CLOSED_STAGES = ['APPROVED', 'REJECTED'];
const MAX_COMMENT_LENGTH = 2000;

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const handler = async (event: RoutePayload) => {
  const assessment = await findAssessmentByToken(event.pathParameters.token);

  if (!assessment || CLOSED_STAGES.includes(assessment.stage)) {
    return json({ error: 'This questionnaire does not accept answers' }, 404);
  }

  const submitted = ((event.body ?? {}) as { answers?: SubmittedAnswer[] })
    .answers;

  if (!Array.isArray(submitted)) {
    return json({ error: 'answers must be an array' }, 400);
  }

  // The token only grants access to this assessment's own responses, so ids
  // from the request are matched against them rather than trusted.
  const ownResponses = await loadResponses(assessment.id);
  const submittedById = new Map(submitted.map((answer) => [answer.id, answer]));
  const idsByValues = new Map<string, string[]>();

  for (const response of ownResponses) {
    const answer = submittedById.get(response.id);

    if (!answer?.answer || !ACCEPTED_ANSWERS.includes(answer.answer)) continue;

    const values = JSON.stringify({
      answer: answer.answer,
      comment: (answer.comment ?? '').slice(0, MAX_COMMENT_LENGTH),
    });

    idsByValues.set(values, [...(idsByValues.get(values) ?? []), response.id]);
  }

  for (const [values, ids] of idsByValues) {
    await updateRecords('assessmentResponses', ids, JSON.parse(values));
  }

  const saved = [...idsByValues.values()].flat().length;

  await refreshAssessmentScore(assessment.id);
  await updateRecord('vendorAssessments', assessment.id, {
    stage: 'IN_REVIEW',
    submittedAt: new Date().toISOString(),
  });

  return json({ saved }, 200);
};

export default defineLogicFunction({
  universalIdentifier: uid('function.vendor-portal-submit'),
  name: 'vendor-portal-submit',
  description: 'Receives questionnaire answers from the public vendor portal',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: `${ROUTES.vendorPortal}/:token`,
    httpMethod: 'POST',
    isAuthRequired: false,
  },
});
