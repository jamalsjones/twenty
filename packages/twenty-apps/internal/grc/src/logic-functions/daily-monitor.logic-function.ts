import { defineLogicFunction } from 'twenty-sdk/define';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';
import {
  addDays,
  createRecord,
  listRecords,
  today,
  updateRecord,
} from './shared/records';

type Contract = {
  id: string;
  name: string;
  status: string;
  expirationDate: string | null;
  renewalNoticeDate: string | null;
  autoRenew: boolean | null;
  vendorId: string | null;
  ownerId: string | null;
};
type Evidence = { id: string; status: string; validUntil: string | null };
type Control = { id: string; status: string; nextTestDue: string | null };
type PolicyException = { id: string; status: string; expiresAt: string | null };

const EXPIRY_WARNING_DAYS = 90;

const isPast = (date: string | null, reference: string) =>
  date !== null && date.slice(0, 10) < reference;

const handler = async () => {
  const now = today();
  const warningHorizon = addDays(now, EXPIRY_WARNING_DAYS);
  const [contracts, evidences, controls, exceptions] = await Promise.all([
    listRecords<Contract>('contracts', 'status[in]:[ACTIVE,EXPIRING]'),
    listRecords<Evidence>('evidences', 'status[in]:[COLLECTED,ACCEPTED]'),
    listRecords<Control>('controls', 'status[eq]:OPERATIONAL'),
    listRecords<PolicyException>('policyExceptions', 'status[eq]:APPROVED'),
  ]);
  const changes = {
    contracts: 0,
    evidence: 0,
    controls: 0,
    exceptions: 0,
    findings: 0,
  };

  for (const contract of contracts) {
    const noticeDate = contract.renewalNoticeDate ?? contract.expirationDate;
    const hasLapsed =
      isPast(contract.expirationDate, now) && !contract.autoRenew;
    const status = hasLapsed
      ? 'EXPIRED'
      : isPast(noticeDate, warningHorizon)
        ? 'EXPIRING'
        : 'ACTIVE';

    if (status === contract.status) continue;

    await updateRecord('contracts', contract.id, { status });
    changes.contracts++;

    if (status !== 'EXPIRED') continue;

    await createRecord('findings', {
      name: `Contract lapsed: ${contract.name}`,
      details:
        'The contract passed its expiration date without renewal. Services may be running without contractual protections.',
      source: 'MONITORING',
      severity: 'HIGH',
      status: 'OPEN',
      dueDate: addDays(now, 14),
      contractId: contract.id,
      ...(contract.vendorId ? { vendorId: contract.vendorId } : {}),
      ...(contract.ownerId ? { ownerId: contract.ownerId } : {}),
    });
    changes.findings++;
  }

  for (const evidence of evidences.filter((item) =>
    isPast(item.validUntil, now),
  )) {
    await updateRecord('evidences', evidence.id, { status: 'STALE' });
    changes.evidence++;
  }

  for (const control of controls.filter((item) =>
    isPast(item.nextTestDue, now),
  )) {
    await updateRecord('controls', control.id, { status: 'NEEDS_ATTENTION' });
    changes.controls++;
  }

  for (const exception of exceptions.filter((item) =>
    isPast(item.expiresAt, now),
  )) {
    await updateRecord('policyExceptions', exception.id, { status: 'EXPIRED' });
    changes.exceptions++;
  }

  return changes;
};

export default defineLogicFunction({
  universalIdentifier: uid('function.daily-monitor'),
  name: 'daily-monitor',
  description:
    'Flags expiring contracts, stale evidence, overdue control tests and lapsed exceptions',
  timeoutSeconds: 300,
  handler,
  cronTriggerSettings: { pattern: '0 6 * * *' },
  httpRouteTriggerSettings: {
    path: ROUTES.runMonitor,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
