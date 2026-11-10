import {
  type defineField,
  type defineObject,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  fieldId,
  type FieldSpec,
  objectId,
  type ObjectSpec,
  type RelationFieldSpec,
  uid,
  WORKSPACE_MEMBER,
} from './dsl';
import { type ObjectKey, OBJECT_SPECS } from './objects';

type ObjectDefinition = Parameters<typeof defineObject>[0];
type FieldDefinition = Parameters<typeof defineField>[0];

const specs: Record<string, ObjectSpec> = OBJECT_SPECS;

const targetObjectId = (target: string) =>
  target === WORKSPACE_MEMBER
    ? STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier
    : objectId(target);

const isRelation = (field: FieldSpec): field is RelationFieldSpec =>
  field.kind === 'RELATION';

const buildOptions = (
  objectKey: string,
  fieldName: string,
  options: readonly (readonly [string, string, string])[],
) =>
  options.map(([value, label, color], position) => ({
    id: uid(`${objectKey}.field.${fieldName}.option.${value}`),
    value,
    label,
    color,
    position,
  }));

const buildOwnField = (objectKey: string, field: FieldSpec) => {
  const base = {
    universalIdentifier: fieldId(objectKey, field.name),
    name: field.name,
    label: field.label,
    icon: field.icon,
    description: field.description,
    isNullable: true,
  };

  if (isRelation(field)) {
    return {
      ...base,
      type: FieldType.RELATION,
      relationTargetObjectMetadataUniversalIdentifier: targetObjectId(
        field.target,
      ),
      relationTargetFieldMetadataUniversalIdentifier: fieldId(
        field.target,
        field.inverseName,
      ),
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete:
          field.onDelete === 'CASCADE'
            ? OnDeleteAction.CASCADE
            : OnDeleteAction.SET_NULL,
        joinColumnName: `${field.name}Id`,
      },
    };
  }

  if (field.kind === 'SELECT' || field.kind === 'MULTI_SELECT') {
    return {
      ...base,
      type: FieldType[field.kind],
      options: buildOptions(objectKey, field.name, field.options),
      ...(field.defaultValue
        ? { defaultValue: `'${field.defaultValue}'`, isNullable: false }
        : {}),
    };
  }

  if (field.kind === 'FILES') {
    return {
      ...base,
      type: FieldType.FILES,
      universalSettings: { maxNumberOfValues: 10 },
    };
  }

  if (field.kind === 'CURRENCY') {
    return {
      ...base,
      type: FieldType.CURRENCY,
      universalSettings: { format: 'short' },
    };
  }

  return { ...base, type: FieldType[field.kind] };
};

const buildInverseField = (
  sourceObjectKey: string,
  field: RelationFieldSpec,
) => ({
  universalIdentifier: fieldId(field.target, field.inverseName),
  type: FieldType.RELATION,
  name: field.inverseName,
  label: field.inverseLabel,
  icon: field.inverseIcon,
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: objectId(sourceObjectKey),
  relationTargetFieldMetadataUniversalIdentifier: fieldId(
    sourceObjectKey,
    field.name,
  ),
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});

const inverseFieldsTargeting = (target: string) =>
  Object.values(specs).flatMap((spec) =>
    spec.fields
      .filter(isRelation)
      .filter((field) => field.target === target)
      .map((field) => buildInverseField(spec.key, field)),
  );

export const buildObject = (key: ObjectKey): ObjectDefinition => {
  const spec = specs[key];

  return {
    universalIdentifier: objectId(key),
    nameSingular: spec.key,
    namePlural: spec.namePlural,
    labelSingular: spec.labelSingular,
    labelPlural: spec.labelPlural,
    description: spec.description,
    icon: spec.icon,
    labelIdentifierFieldMetadataUniversalIdentifier: fieldId(key, 'name'),
    fields: [
      ...spec.fields.map((field) => buildOwnField(key, field)),
      ...inverseFieldsTargeting(key),
    ],
    // The manifest type is a union discriminated per field type, which a
    // generic builder cannot narrow; defineObject validates the shape at build.
  } as ObjectDefinition;
};

// Twenty requires both sides of a relation, so every "owner" relation needs
// a matching collection field on the standard workspaceMember object.
export const buildWorkspaceMemberField = (
  inverseName: string,
): FieldDefinition => {
  const field = inverseFieldsTargeting(WORKSPACE_MEMBER).find(
    (candidate) => candidate.name === inverseName,
  );

  if (!field) {
    throw new Error(`No owner relation declares "${inverseName}"`);
  }

  return {
    ...field,
    objectUniversalIdentifier:
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  } as FieldDefinition;
};
