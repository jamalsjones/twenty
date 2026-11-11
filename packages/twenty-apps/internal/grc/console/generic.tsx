import { type ReactNode, useState } from 'react';

import { type ObjectKey } from '../src/schema/objects';
import { type AnyRecord, createRecord, updateRecord } from './api';
import { OBJECT_VIEWS } from './config';
import {
  displayName,
  fieldOf,
  FieldValue,
  optionsOf,
  sortValue,
  specOf,
} from './fields';
import { pluralOf, useStore } from './store';

export const openRecord = (objectKey: string, id: string) => {
  window.location.hash = `#/o/${objectKey}/${id}`;
};

type RecordTableProps = {
  objectKey: ObjectKey;
  columns: string[];
  records: AnyRecord[];
  emptyText?: string;
};

export const RecordTable = ({
  objectKey,
  columns,
  records,
  emptyText,
}: RecordTableProps) => {
  const [sort, setSort] = useState<{
    column: string;
    descending: boolean;
  } | null>(null);
  const sorted = sort
    ? [...records].sort((left, right) => {
        const a = sortValue(objectKey, sort.column, left);
        const b = sortValue(objectKey, sort.column, right);
        const order = a < b ? -1 : a > b ? 1 : 0;

        return sort.descending ? -order : order;
      })
    : records;

  if (records.length === 0) {
    return <div className="empty">{emptyText ?? 'Nothing here yet.'}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => {
              const field = fieldOf(objectKey, column);
              const isNumeric =
                field.kind === 'NUMBER' || field.kind === 'CURRENCY';

              return (
                <th
                  key={column}
                  className={isNumeric ? 'num' : undefined}
                  onClick={() =>
                    setSort({
                      column,
                      descending:
                        sort?.column === column ? !sort.descending : false,
                    })
                  }
                >
                  {field.label}
                  {sort?.column === column
                    ? sort.descending
                      ? ' ↓'
                      : ' ↑'
                    : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((record) => (
            <tr
              key={record.id}
              onClick={() => openRecord(objectKey, record.id)}
            >
              {columns.map((column) => {
                const kind = fieldOf(objectKey, column).kind;

                return (
                  <td
                    key={column}
                    className={
                      kind === 'NUMBER' || kind === 'CURRENCY'
                        ? 'num'
                        : column === 'name'
                          ? 'primary-cell'
                          : column === 'refId' || column === 'reference'
                            ? 'ref'
                            : undefined
                    }
                  >
                    <FieldValue
                      objectKey={objectKey}
                      fieldName={column}
                      record={record}
                      onOpen={openRecord}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

type FieldInputProps = {
  objectKey: ObjectKey;
  fieldName: string;
  value: unknown;
  onChange: (value: unknown) => void;
};

const FieldInput = ({
  objectKey,
  fieldName,
  value,
  onChange,
}: FieldInputProps) => {
  const store = useStore();
  const field = fieldOf(objectKey, fieldName);
  const id = `create-${objectKey}-${fieldName}`;

  if (field.kind === 'SELECT') {
    return (
      <select
        id={id}
        className="select"
        value={(value as string) ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Select…</option>
        {field.options.map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </select>
    );
  }

  if (field.kind === 'MULTI_SELECT') {
    const selected = (value as string[] | undefined) ?? [];

    return (
      <div className="row">
        {field.options.map(([option, label]) => (
          <label key={option} className="row" style={{ gap: 4 }}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
    );
  }

  if (field.kind === 'RELATION') {
    return (
      <select
        id={id}
        className="select"
        value={(value as string) ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Select…</option>
        {store.records(field.target).map((record) => (
          <option key={record.id} value={record.id}>
            {displayName(record)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={id}
      className="input"
      type={
        field.kind === 'DATE'
          ? 'date'
          : field.kind === 'NUMBER'
            ? 'number'
            : 'text'
      }
      value={(value as string) ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

type CreateDialogProps = {
  objectKey: ObjectKey;
  onClose: () => void;
  notify: (message: string, isError?: boolean) => void;
};

const CreateDialog = ({ objectKey, onClose, notify }: CreateDialogProps) => {
  const store = useStore();
  const view = OBJECT_VIEWS[objectKey];
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const data = Object.fromEntries(
        Object.entries(values)
          .filter(([, value]) => value !== '' && value !== null)
          .map(([fieldName, value]) => {
            const field = fieldOf(objectKey, fieldName);

            if (field.kind === 'RELATION') return [`${fieldName}Id`, value];
            if (field.kind === 'NUMBER') return [fieldName, Number(value)];

            return [fieldName, value];
          }),
      );
      const created = await createRecord(pluralOf(objectKey), data);

      await store.reload();
      notify(`${specOf(objectKey).labelSingular} created`);
      onClose();
      openRecord(objectKey, created.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save', true);
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="card-head">
          <h3>New {specOf(objectKey).labelSingular.toLowerCase()}</h3>
        </div>
        <div
          className="card-body"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {(view?.createFields ?? []).map((fieldName) => (
            <div key={fieldName}>
              <label
                className="field-label"
                htmlFor={`create-${objectKey}-${fieldName}`}
              >
                {fieldOf(objectKey, fieldName).label}
              </label>
              <FieldInput
                objectKey={objectKey}
                fieldName={fieldName}
                value={values[fieldName]}
                onChange={(value) =>
                  setValues({ ...values, [fieldName]: value })
                }
              />
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={isSaving || !values.name}
              onClick={handleSave}
            >
              {isSaving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type ListPageProps = {
  objectKey: ObjectKey;
  notify: (message: string, isError?: boolean) => void;
  header?: ReactNode;
};

export const ListPage = ({ objectKey, notify, header }: ListPageProps) => {
  const store = useStore();
  const view = OBJECT_VIEWS[objectKey];
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  if (!view) return <div className="empty">No view configured.</div>;

  const records = store
    .records(objectKey)
    .filter(
      (record) =>
        displayName(record).toLowerCase().includes(search.toLowerCase()) &&
        Object.entries(filters).every(
          ([fieldName, value]) => !value || record[fieldName] === value,
        ),
    );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{view.title}</h1>
          <div className="sub">{view.description}</div>
        </div>
        {view.createFields ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => setIsCreating(true)}
          >
            New {specOf(objectKey).labelSingular.toLowerCase()}
          </button>
        ) : null}
      </div>
      {header}
      <div className="card">
        <div className="card-head">
          <div className="row">
            <input
              className="input"
              placeholder="Search by name"
              aria-label="Search by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {view.filters.map((fieldName) => (
              <select
                key={fieldName}
                className="select"
                aria-label={fieldOf(objectKey, fieldName).label}
                value={filters[fieldName] ?? ''}
                onChange={(event) =>
                  setFilters({ ...filters, [fieldName]: event.target.value })
                }
              >
                <option value="">
                  {fieldOf(objectKey, fieldName).label}: all
                </option>
                {optionsOf(objectKey, fieldName).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <span className="muted">
            {records.length} of {store.records(objectKey).length}
          </span>
        </div>
        <RecordTable
          objectKey={objectKey}
          columns={view.columns}
          records={records}
          emptyText="No records match these filters."
        />
      </div>
      {isCreating ? (
        <CreateDialog
          objectKey={objectKey}
          onClose={() => setIsCreating(false)}
          notify={notify}
        />
      ) : null}
    </>
  );
};

type StepperProps = {
  objectKey: ObjectKey;
  fieldName: string;
  record: AnyRecord;
  notify: (message: string, isError?: boolean) => void;
};

export const Stepper = ({
  objectKey,
  fieldName,
  record,
  notify,
}: StepperProps) => {
  const store = useStore();
  const options = optionsOf(objectKey, fieldName);
  const currentIndex = options.findIndex(
    ([value]) => value === record[fieldName],
  );

  const handleMove = async (value: string, label: string) => {
    if (value === record[fieldName]) return;

    try {
      await updateRecord(pluralOf(objectKey), record.id, {
        [fieldName]: value,
      });
      await store.reload();
      notify(`Moved to ${label}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update', true);
    }
  };

  return (
    <div
      className="stepper"
      role="group"
      aria-label={fieldOf(objectKey, fieldName).label}
    >
      {options.map(([value, label], index) => (
        <button
          key={value}
          type="button"
          className={`step ${index === currentIndex ? 'current' : index < currentIndex ? 'done' : ''}`}
          onClick={() => handleMove(value, label)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

type RecordPageProps = {
  objectKey: ObjectKey;
  record: AnyRecord;
  notify: (message: string, isError?: boolean) => void;
  children?: ReactNode;
};

export const RecordPage = ({
  objectKey,
  record,
  notify,
  children,
}: RecordPageProps) => {
  const store = useStore();
  const view = OBJECT_VIEWS[objectKey];

  if (!view) return <div className="empty">No view configured.</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">
            {specOf(objectKey).labelSingular}
            {record.refId ? ` · ${String(record.refId)}` : ''}
          </div>
          <h1>{displayName(record)}</h1>
        </div>
        <a
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center' }}
          href={`/object/${objectKey}/${record.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Edit in admin
        </a>
      </div>
      {view.stageField ? (
        <Stepper
          objectKey={objectKey}
          fieldName={view.stageField}
          record={record}
          notify={notify}
        />
      ) : null}
      {children}
      {view.sections.map((section) => (
        <div className="card" key={section.title}>
          <div className="card-head">
            <h3>{section.title}</h3>
          </div>
          <div className="card-body fields">
            {section.fields.map((fieldName) => {
              const field = fieldOf(objectKey, fieldName);
              const isWide =
                field.kind === 'TEXT' &&
                String(record[fieldName] ?? '').length > 60;

              return (
                <div
                  key={fieldName}
                  className={`field ${isWide ? 'wide' : ''}`}
                >
                  <div className="field-label">{field.label}</div>
                  <div className="field-value">
                    <FieldValue
                      objectKey={objectKey}
                      fieldName={fieldName}
                      record={record}
                      onOpen={openRecord}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {view.related.map((related) => {
        const records = store
          .records(related.objectKey)
          .filter((item) => item[related.foreignKey] === record.id);

        return (
          <div className="card" key={related.label}>
            <div className="card-head">
              <h3>{related.label}</h3>
              <span className="muted">{records.length}</span>
            </div>
            <RecordTable
              objectKey={related.objectKey}
              columns={related.columns}
              records={records}
              emptyText="None."
            />
          </div>
        );
      })}
    </>
  );
};
