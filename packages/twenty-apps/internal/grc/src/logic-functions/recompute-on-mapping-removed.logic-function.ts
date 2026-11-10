import { defineLogicFunction } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';
import { recomputeCompliance } from './shared/compliance';

export default defineLogicFunction({
  universalIdentifier: uid('function.recompute-on-mapping-removed'),
  name: 'recompute-compliance-on-mapping-removed',
  description: 'Re-rates requirements when a control mapping is removed',
  timeoutSeconds: 300,
  handler: recomputeCompliance,
  databaseEventTriggerSettings: {
    eventName: 'controlRequirement.deleted',
    batchMode: true,
  },
});
