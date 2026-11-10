import { defineLogicFunction } from 'twenty-sdk/define';
import type {
  LogicFunctionExecutionContext,
  RoutePayload,
} from 'twenty-sdk/logic-function';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';
import { launchAssessment } from './shared/assessments';

const handler = async (
  event: RoutePayload,
  { workspaceMemberId }: LogicFunctionExecutionContext,
) => {
  const { vendorId } = (event.body ?? {}) as { vendorId?: string };

  if (!vendorId) throw new Error('vendorId is required');

  return launchAssessment(vendorId, workspaceMemberId);
};

export default defineLogicFunction({
  universalIdentifier: uid('function.launch-assessment'),
  name: 'launch-vendor-assessment',
  description:
    'Creates a due diligence assessment for a vendor from the questionnaire library',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: ROUTES.launchAssessment,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
