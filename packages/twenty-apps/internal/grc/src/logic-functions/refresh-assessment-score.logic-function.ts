import { defineLogicFunction } from 'twenty-sdk/define';
import type {
  DatabaseEventBatchPayload,
  ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import { uid } from '../schema/dsl';
import { refreshAssessmentScore } from './shared/assessments';

type ResponseBatch = DatabaseEventBatchPayload<
  ObjectRecordUpdateEvent<{ assessmentId: string | null }>
>;

const handler = async (batch: ResponseBatch) => {
  const assessmentIds = new Set(
    batch.events.flatMap((event) => event.properties.after?.assessmentId ?? []),
  );

  for (const assessmentId of assessmentIds) {
    await refreshAssessmentScore(assessmentId);
  }

  return { refreshed: assessmentIds.size };
};

export default defineLogicFunction({
  universalIdentifier: uid('function.refresh-assessment-score'),
  name: 'refresh-assessment-score',
  description: 'Keeps an assessment score in step with its answers',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'assessmentResponse.updated',
    updatedFields: ['answer', 'weight'],
    batchMode: true,
  },
});
