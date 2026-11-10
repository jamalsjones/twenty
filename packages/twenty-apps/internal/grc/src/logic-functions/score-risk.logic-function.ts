import { defineLogicFunction } from 'twenty-sdk/define';
import type {
  DatabaseEventPayload,
  ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import { scoreRisk } from '../domain/scoring';
import { uid } from '../schema/dsl';
import { updateRecord } from './shared/records';

type Risk = {
  inherentLikelihood: string | null;
  inherentImpact: string | null;
  inherentScore: number | null;
  inherentLevel: string | null;
  residualLikelihood: string | null;
  residualImpact: string | null;
  residualScore: number | null;
  residualLevel: string | null;
};

type RiskEvent = DatabaseEventPayload<ObjectRecordUpdateEvent<Risk>>;

const handler = async (event: RiskEvent) => {
  const risk = event.properties.after;
  const isWrite = /\.(created|updated)$/.test(event.name);

  if (!risk || !isWrite) return { skipped: true };

  const inherent = scoreRisk(risk.inherentLikelihood, risk.inherentImpact);
  const residual = scoreRisk(risk.residualLikelihood, risk.residualImpact);
  const next = {
    inherentScore: inherent?.score ?? null,
    inherentLevel: inherent?.level ?? null,
    residualScore: residual?.score ?? null,
    residualLevel: residual?.level ?? null,
  };
  const isUnchanged = (Object.keys(next) as (keyof typeof next)[]).every(
    (key) => (risk[key] ?? null) === next[key],
  );

  // Writing the scores fires this trigger again; stopping when nothing
  // changed is what ends that loop.
  if (isUnchanged) return { skipped: true };

  await updateRecord('risks', event.recordId, next);

  return next;
};

export default defineLogicFunction({
  universalIdentifier: uid('function.score-risk'),
  name: 'score-risk',
  description:
    'Derives inherent and residual score and level from likelihood and impact',
  timeoutSeconds: 15,
  handler,
  databaseEventTriggerSettings: { eventName: 'risk.*' },
});
