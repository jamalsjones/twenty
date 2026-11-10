import { createHash } from 'node:crypto';

// Every entity id is derived from a stable key, so the schema can be written
// as plain data without hand-maintaining hundreds of UUIDs. Renaming a key
// changes the id, which the sync treats as delete + create.
export const uid = (key: string): string => {
  const hash = createHash('sha256').update(`grc:${key}`).digest('hex');

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
};

export const objectId = (objectKey: string) => uid(`object.${objectKey}`);

export const fieldId = (objectKey: string, fieldName: string) =>
  uid(`${objectKey}.field.${fieldName}`);

export type TagColor =
  | 'green'
  | 'turquoise'
  | 'sky'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'gray';

export type SelectOptionSpec = readonly [
  value: string,
  label: string,
  color: TagColor,
];

type BaseFieldSpec = {
  name: string;
  label: string;
  icon: string;
  description?: string;
};

export type ScalarFieldSpec = BaseFieldSpec & {
  kind:
    | 'TEXT'
    | 'NUMBER'
    | 'DATE'
    | 'DATE_TIME'
    | 'BOOLEAN'
    | 'CURRENCY'
    | 'RICH_TEXT'
    | 'LINKS'
    | 'FILES'
    | 'EMAILS';
};

export type SelectFieldSpec = BaseFieldSpec & {
  kind: 'SELECT' | 'MULTI_SELECT';
  options: readonly SelectOptionSpec[];
  defaultValue?: string;
};

export type RelationFieldSpec = BaseFieldSpec & {
  kind: 'RELATION';
  target: string;
  inverseName: string;
  inverseLabel: string;
  inverseIcon: string;
  onDelete: 'CASCADE' | 'SET_NULL';
};

export type FieldSpec = ScalarFieldSpec | SelectFieldSpec | RelationFieldSpec;

export type ObjectSpec = {
  key: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  description: string;
  icon: string;
  fields: FieldSpec[];
};

const scalar =
  (kind: ScalarFieldSpec['kind'], defaultIcon: string) =>
  (name: string, label: string, icon = defaultIcon): ScalarFieldSpec => ({
    kind,
    name,
    label,
    icon,
  });

export const text = scalar('TEXT', 'IconAbc');
export const number = scalar('NUMBER', 'IconNumbers');
export const date = scalar('DATE', 'IconCalendar');
export const dateTime = scalar('DATE_TIME', 'IconCalendarClock');
export const boolean = scalar('BOOLEAN', 'IconToggleRight');
export const currency = scalar('CURRENCY', 'IconCurrencyDollar');
export const richText = scalar('RICH_TEXT', 'IconFileText');
export const links = scalar('LINKS', 'IconLink');
export const files = scalar('FILES', 'IconPaperclip');
export const emails = scalar('EMAILS', 'IconMail');

export const select = (
  name: string,
  label: string,
  icon: string,
  options: readonly SelectOptionSpec[],
  defaultValue?: string,
): SelectFieldSpec => ({
  kind: 'SELECT',
  name,
  label,
  icon,
  options,
  defaultValue,
});

export const multiSelect = (
  name: string,
  label: string,
  icon: string,
  options: readonly SelectOptionSpec[],
): SelectFieldSpec => ({ kind: 'MULTI_SELECT', name, label, icon, options });

export const WORKSPACE_MEMBER = 'workspaceMember';

export const manyToOne = (
  name: string,
  label: string,
  icon: string,
  target: string,
  inverse: { name: string; label: string; icon: string },
  onDelete: RelationFieldSpec['onDelete'] = 'SET_NULL',
): RelationFieldSpec => ({
  kind: 'RELATION',
  name,
  label,
  icon,
  target,
  inverseName: inverse.name,
  inverseLabel: inverse.label,
  inverseIcon: inverse.icon,
  onDelete,
});
