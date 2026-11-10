import { defineLogicFunction } from 'twenty-sdk/define';
import type {
  DatabaseEventPayload,
  ObjectRecordCreateEvent,
} from 'twenty-sdk/logic-function';

import { uid } from '../schema/dsl';
import {
  addDays,
  createRecord,
  findRecord,
  today,
  updateRecord,
} from './shared/records';

type ControlTest = {
  name: string;
  controlId: string | null;
  result: string | null;
  performedAt: string | null;
  notes: string | null;
};
type Control = {
  id: string;
  name: string;
  testFrequency: string | null;
  ownerId: string | null;
};
type ControlTestEvent = DatabaseEventPayload<
  ObjectRecordCreateEvent<ControlTest>
>;

const EFFECTIVENESS_BY_RESULT: Record<string, string> = {
  PASS: 'EFFECTIVE',
  PASS_WITH_EXCEPTIONS: 'PARTIALLY_EFFECTIVE',
  FAIL: 'INEFFECTIVE',
};
const DAYS_BY_FREQUENCY: Record<string, number> = {
  CONTINUOUS: 30,
  MONTHLY: 30,
  QUARTERLY: 91,
  SEMI_ANNUAL: 182,
  ANNUAL: 365,
};

const handler = async (event: ControlTestEvent) => {
  const test = event.properties.after;
  const effectiveness = EFFECTIVENESS_BY_RESULT[test.result ?? ''];

  if (!test.controlId || !effectiveness) return { skipped: true };

  const control = await findRecord<Control>(
    'controls',
    `id[eq]:"${test.controlId}"`,
  );

  if (!control) return { skipped: true };

  const performedAt = test.performedAt ?? today();

  await updateRecord('controls', control.id, {
    effectiveness,
    status: test.result === 'FAIL' ? 'NEEDS_ATTENTION' : 'OPERATIONAL',
    lastTestedAt: performedAt,
    nextTestDue: addDays(
      performedAt,
      DAYS_BY_FREQUENCY[control.testFrequency ?? 'ANNUAL'],
    ),
  });

  if (test.result !== 'FAIL') return { effectiveness };

  await createRecord('findings', {
    name: `Control test failed: ${control.name}`,
    details: test.notes ?? `Test "${test.name}" did not pass.`,
    source: 'CONTROL_TEST',
    severity: 'HIGH',
    status: 'OPEN',
    dueDate: addDays(today(), 30),
    controlId: control.id,
    ...(control.ownerId ? { ownerId: control.ownerId } : {}),
  });

  return { effectiveness, findingRaised: true };
};

export default defineLogicFunction({
  universalIdentifier: uid('function.record-control-test'),
  name: 'record-control-test',
  description:
    'Applies a test result to its control, schedules the next test and raises a finding on failure',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: { eventName: 'controlTest.created' },
});
