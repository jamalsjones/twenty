import { defineLogicFunction } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';
import { recomputeCompliance } from './shared/compliance';

export default defineLogicFunction({
  universalIdentifier: uid('function.recompute-on-mapping-created'),
  name: 'recompute-compliance-on-mapping-created',
  description: 'Re-rates requirements when a control is mapped to one',
  timeoutSeconds: 300,
  handler: recomputeCompliance,
  databaseEventTriggerSettings: {
    eventName: 'controlRequirement.created',
    batchMode: true,
  },
});
