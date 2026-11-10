import { defineLogicFunction } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';
import { recomputeCompliance } from './shared/compliance';

export default defineLogicFunction({
  universalIdentifier: uid('function.recompute-on-control-changed'),
  name: 'recompute-compliance-on-control-changed',
  description:
    'Re-rates requirements when a control changes status or effectiveness',
  timeoutSeconds: 300,
  handler: recomputeCompliance,
  databaseEventTriggerSettings: {
    eventName: 'control.updated',
    batchMode: true,
    updatedFields: ['status', 'effectiveness'],
  },
});
