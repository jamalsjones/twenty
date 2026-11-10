import { defineFrontComponent, PageLayoutType } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants';
import { listRecords } from './shared/api';
import { daysUntil, formatDate, openRecord } from './shared/navigation';
import { type Tone } from './shared/tokens';
import { LoadState, Muted, Panel, Pill, RowLink } from './shared/ui';
import { useAsync } from './shared/use-async';

type Dated = { id: string; name: string };
type Contract = Dated & {
  status: string;
  expirationDate: string | null;
  renewalNoticeDate: string | null;
};
type Finding = Dated & {
  status: string;
  severity: string;
  dueDate: string | null;
};
type Policy = Dated & { status: string; nextReviewDate: string | null };
type Vendor = Dated & { status: string; nextReviewDate: string | null };
type Evidence = Dated & { status: string; validUntil: string | null };
type Control = Dated & { status: string; nextTestDue: string | null };

type QueueItem = {
  key: string;
  object: string;
  recordId: string;
  label: string;
  title: string;
  date: string;
  tone: Tone;
};

const HORIZON_DAYS = 60;
const OPEN_FINDING_STATUSES = [
  'OPEN',
  'IN_REMEDIATION',
  'READY_FOR_VALIDATION',
];

const toItems = <TRecord extends Dated>(
  records: TRecord[],
  object: string,
  label: string,
  tone: Tone,
  dateOf: (record: TRecord) => string | null,
  isRelevant: (record: TRecord) => boolean,
): QueueItem[] =>
  records.flatMap((record) => {
    const date = dateOf(record);

    return date && isRelevant(record) && daysUntil(date) <= HORIZON_DAYS
      ? [
          {
            key: `${object}-${record.id}`,
            object,
            recordId: record.id,
            label,
            title: record.name,
            date,
            tone,
          },
        ]
      : [];
  });

const loadQueue = async (): Promise<QueueItem[]> => {
  const [contracts, findings, policies, vendors, evidences, controls] =
    await Promise.all([
      listRecords<Contract>('contracts'),
      listRecords<Finding>('findings'),
      listRecords<Policy>('policies'),
      listRecords<Vendor>('vendors'),
      listRecords<Evidence>('evidences'),
      listRecords<Control>('controls'),
    ]);

  return [
    ...toItems(
      contracts,
      'contract',
      'Renewal notice',
      'orange',
      (contract) => contract.renewalNoticeDate ?? contract.expirationDate,
      (contract) => ['ACTIVE', 'EXPIRING'].includes(contract.status),
    ),
    ...toItems(
      findings,
      'finding',
      'Finding due',
      'red',
      (finding) => finding.dueDate,
      (finding) => OPEN_FINDING_STATUSES.includes(finding.status),
    ),
    ...toItems(
      policies,
      'policy',
      'Policy review',
      'blue',
      (policy) => policy.nextReviewDate,
      (policy) => policy.status === 'PUBLISHED',
    ),
    ...toItems(
      vendors,
      'vendor',
      'Vendor review',
      'purple',
      (vendor) => vendor.nextReviewDate,
      (vendor) => ['APPROVED', 'CONDITIONAL'].includes(vendor.status),
    ),
    ...toItems(
      evidences,
      'evidence',
      'Evidence expiry',
      'yellow',
      (evidence) => evidence.validUntil,
      (evidence) => evidence.status !== 'REQUESTED',
    ),
    ...toItems(
      controls,
      'control',
      'Control test',
      'turquoise',
      (control) => control.nextTestDue,
      (control) => control.status === 'OPERATIONAL',
    ),
  ].sort((left, right) => left.date.localeCompare(right.date));
};

const describeDeadline = (date: string) => {
  const days = daysUntil(date);

  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return 'today';

  return `in ${days}d`;
};

const AttentionQueue = () => {
  const { data, error, isLoading } = useAsync(loadQueue, 'queue');

  if (!data) {
    return <LoadState isLoading={isLoading} error={error} />;
  }

  const overdueCount = data.filter((item) => daysUntil(item.date) < 0).length;

  return (
    <Panel style={{ gap: 4 }}>
      <Muted>
        {data.length} deadlines in the next {HORIZON_DAYS} days, {overdueCount}{' '}
        overdue
      </Muted>
      {data.map((item) => (
        <RowLink
          key={item.key}
          onClick={() => openRecord(item.object, item.recordId)}
        >
          <Pill tone={item.tone}>{item.label}</Pill>
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </span>
          <Muted>{formatDate(item.date)}</Muted>
          <Pill tone={daysUntil(item.date) < 0 ? 'red' : 'gray'}>
            {describeDeadline(item.date)}
          </Pill>
        </RowLink>
      ))}
    </Panel>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.attentionQueue,
  name: 'grc-attention-queue',
  description: 'Every upcoming or overdue GRC deadline in one list',
  component: AttentionQueue,
  widgetAvailability: { pageLayoutType: PageLayoutType.DASHBOARD },
});
