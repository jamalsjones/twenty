import { defineLogicFunction } from 'twenty-sdk/define';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';
import { recomputeCompliance } from './shared/compliance';

export default defineLogicFunction({
  universalIdentifier: uid('function.recompute-compliance'),
  name: 'recompute-compliance',
  description:
    'Rebuilds requirement statuses and framework coverage from mapped controls',
  timeoutSeconds: 300,
  handler: recomputeCompliance,
  httpRouteTriggerSettings: {
    path: ROUTES.recomputeCompliance,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
