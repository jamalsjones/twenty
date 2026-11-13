import { type ReactNode } from 'react';

import { type FieldSpec, type ObjectSpec } from '../src/schema/dsl';
import { OBJECT_SPECS, type ObjectKey } from '../src/schema/objects';
import { type AnyRecord } from './api';
import { useStore, WORKSPACE_MEMBER } from './store';

export const specOf = (objectKey: string): ObjectSpec =>
  OBJECT_SPECS[objectKey as ObjectKey];

export const fieldOf = (objectKey: string, fieldName: string): FieldSpec => {
  const field = specOf(objectKey).fields.find(
    (candidate) => candidate.name === fieldName,
  );

  if (!field) throw new Error(`Unknown field ${objectKey}.${fieldName}`);

  return field;
};

export const optionsOf = (objectKey: string, fieldName: string) => {
  const field = fieldOf(objectKey, fieldName);

  return field.kind === 'SELECT' || field.kind === 'MULTI_SELECT'
    ? field.options
    : [];
};

export const formatDate = (value: unknown) =>
  typeof value === 'string' && value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: value.length <= 10 ? 'UTC' : undefined,
      })
    : '';

const MILLISECONDS_PER_DAY = 86_400_000;

export const daysUntil = (value: string) =>
  Math.round((new Date(value).getTime() - Date.now()) / MILLISECONDS_PER_DAY);

export const formatMoney = (value: unknown) => {
  const amount = (value as { amountMicros?: number | null } | null)
    ?.amountMicros;

  return typeof amount === 'number'
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount / 1_000_000)
    : '';
};

export const displayName = (record: AnyRecord | undefined): string => {
  if (!record) return '';

  const name = record.name as
    | string
    | { firstName?: string; lastName?: string }
    | undefined;

  return typeof name === 'object' && name !== null
    ? [name.firstName, name.lastName].filter(Boolean).join(' ')
    : (name ?? '');
};

type BadgeProps = { tone: string; children: ReactNode };

export const Badge = ({ tone, children }: BadgeProps) => (
  <span className={`badge ${tone}`}>{children}</span>
);

// Colour is reserved for fields that report state or severity; descriptive
// fields such as category or type render as neutral chips.
const STATE_FIELDS =
  /status|stage|tier|risk|level|severity|criticality|classification|access|effectiveness|result|answer|verdict|likelihood|impact/i;

type OptionBadgeProps = {
  objectKey: string;
  fieldName: string;
  value: unknown;
};

export const OptionBadge = ({
  objectKey,
  fieldName,
  value,
}: OptionBadgeProps) => {
  const option = optionsOf(objectKey, fieldName).find(
    ([candidate]) => candidate === value,
  );

  if (!option) return null;

  return (
    <Badge tone={STATE_FIELDS.test(fieldName) ? option[2] : 'neutral'}>
      {option[1]}
    </Badge>
  );
};

type FieldValueProps = {
  objectKey: string;
  fieldName: string;
  record: AnyRecord;
  onOpen?: (objectKey: string, id: string) => void;
};

export const FieldValue = ({
  objectKey,
  fieldName,
  record,
  onOpen,
}: FieldValueProps) => {
  const store = useStore();
  const field = fieldOf(objectKey, fieldName);
  const value = record[fieldName];

  switch (field.kind) {
    case 'SELECT':
      return (
        <OptionBadge
          objectKey={objectKey}
          fieldName={fieldName}
          value={value}
        />
      );
    case 'MULTI_SELECT':
      return (
        <span className="row" style={{ gap: 4 }}>
          {((value as string[] | null) ?? []).map((item) => (
            <OptionBadge
              key={item}
              objectKey={objectKey}
              fieldName={fieldName}
              value={item}
            />
          ))}
        </span>
      );
    case 'RELATION': {
      const target = store.find(field.target, record[`${fieldName}Id`]);

      if (!target) return null;

      return field.target === WORKSPACE_MEMBER || !onOpen ? (
        <span>{displayName(target)}</span>
      ) : (
        <a
          href={`#/o/${field.target}/${target.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          {displayName(target)}
        </a>
      );
    }
    case 'DATE':
    case 'DATE_TIME':
      return <span>{formatDate(value)}</span>;
    case 'CURRENCY':
      return <span>{formatMoney(value)}</span>;
    case 'BOOLEAN':
      return (
        <span>{value === true ? 'Yes' : value === false ? 'No' : ''}</span>
      );
    case 'LINKS': {
      const url = (value as { primaryLinkUrl?: string } | null)?.primaryLinkUrl;

      return url ? <span>{url.replace(/^https?:\/\//, '')}</span> : null;
    }
    case 'EMAILS':
      return (
        <span>
          {(value as { primaryEmail?: string } | null)?.primaryEmail ?? ''}
        </span>
      );
    case 'RICH_TEXT':
      return (
        <span>{(value as { markdown?: string } | null)?.markdown ?? ''}</span>
      );
    case 'FILES':
      return (
        <span>
          {Array.isArray(value) && value.length > 0
            ? `${value.length} file(s)`
            : ''}
        </span>
      );
    default:
      return (
        <span>
          {value === null || value === undefined ? '' : String(value)}
        </span>
      );
  }
};

export const sortValue = (
  objectKey: string,
  fieldName: string,
  record: AnyRecord,
) => {
  const field = fieldOf(objectKey, fieldName);
  const value = record[fieldName];

  if (field.kind === 'SELECT') {
    return optionsOf(objectKey, fieldName).findIndex(
      ([candidate]) => candidate === value,
    );
  }

  if (field.kind === 'CURRENCY') {
    return (value as { amountMicros?: number } | null)?.amountMicros ?? -1;
  }

  return typeof value === 'number' ? value : String(value ?? '').toLowerCase();
};
