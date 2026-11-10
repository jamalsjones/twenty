import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';
import { completeAssessment } from './shared/assessments';

const DECISIONS = ['APPROVED', 'REMEDIATION', 'REJECTED'] as const;

type Decision = (typeof DECISIONS)[number];

const handler = async (event: RoutePayload) => {
  const { assessmentId, decision } = (event.body ?? {}) as {
    assessmentId?: string;
    decision?: Decision;
  };

  if (!assessmentId || !decision || !DECISIONS.includes(decision)) {
    throw new Error('assessmentId and a valid decision are required');
  }

  return completeAssessment(assessmentId, decision);
};

export default defineLogicFunction({
  universalIdentifier: uid('function.complete-assessment'),
  name: 'complete-vendor-assessment',
  description:
    'Records the reviewer decision, updates the vendor risk rating and raises findings for gaps',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: ROUTES.completeAssessment,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
