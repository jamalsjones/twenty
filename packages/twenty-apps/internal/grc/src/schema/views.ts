import {
  type defineView,
  ViewCalendarLayout,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import { fieldId, objectId, uid } from './dsl';
import { type ObjectKey, OBJECT_SPECS } from './objects';

type ViewDefinition = Parameters<typeof defineView>[0];

type ViewSpec = {
  object: ObjectKey;
  name: string;
  icon: string;
  layout?: 'TABLE' | 'KANBAN' | 'CALENDAR';
  fields: string[];
  groupBy?: string;
  calendarField?: string;
  isAnyOf?: Record<string, string[]>;
  sortDescendingBy?: string;
  position?: number;
};

const FIELD_SIZES: Record<string, number> = {
  name: 260,
  question: 420,
  statement: 360,
  summary: 320,
};

const VIEW_SPECS = {
  'vendors-all': {
    object: 'vendor',
    name: 'All vendors',
    icon: 'IconList',
    fields: [
      'name',
      'status',
      'tier',
      'inherentRisk',
      'residualRisk',
      'securityScore',
      'category',
      'dataClassification',
      'certifications',
      'annualSpend',
      'nextReviewDate',
      'owner',
    ],
  },
  'vendors-onboarding': {
    object: 'vendor',
    name: 'Onboarding pipeline',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'tier', 'inherentRisk', 'category', 'owner'],
  },
  'vendors-critical': {
    object: 'vendor',
    name: 'Critical and high tier',
    icon: 'IconFlame',
    isAnyOf: { tier: ['TIER_1', 'TIER_2'] },
    sortDescendingBy: 'annualSpend',
    fields: [
      'name',
      'tier',
      'residualRisk',
      'securityScore',
      'dataTypes',
      'systemAccess',
      'lastAssessedAt',
      'nextReviewDate',
      'annualSpend',
    ],
  },
  'assessments-pipeline': {
    object: 'vendorAssessment',
    name: 'Assessment pipeline',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'stage',
    fields: ['name', 'vendor', 'score', 'riskRating', 'dueDate'],
  },
  'assessments-all': {
    object: 'vendorAssessment',
    name: 'All assessments',
    icon: 'IconList',
    fields: [
      'name',
      'vendor',
      'stage',
      'assessmentType',
      'score',
      'riskRating',
      'answeredCount',
      'questionCount',
      'dueDate',
      'submittedAt',
      'owner',
    ],
  },
  'responses-all': {
    object: 'assessmentResponse',
    name: 'All responses',
    icon: 'IconList',
    fields: [
      'name',
      'assessment',
      'section',
      'question',
      'answer',
      'verdict',
      'comment',
    ],
  },
  'contracts-all': {
    object: 'contract',
    name: 'All contracts',
    icon: 'IconList',
    fields: [
      'name',
      'reference',
      'vendor',
      'contractType',
      'status',
      'annualValue',
      'expirationDate',
      'renewalNoticeDate',
      'autoRenew',
      'clauses',
      'riskRating',
      'owner',
    ],
  },
  'contracts-lifecycle': {
    object: 'contract',
    name: 'Contract lifecycle',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'vendor', 'contractType', 'annualValue', 'expirationDate'],
  },
  'contracts-renewals': {
    object: 'contract',
    name: 'Renewal calendar',
    icon: 'IconCalendarEvent',
    layout: 'CALENDAR',
    calendarField: 'expirationDate',
    fields: ['name', 'vendor', 'annualValue', 'autoRenew'],
  },
  'contracts-gaps': {
    object: 'contract',
    name: 'Expiring and expired',
    icon: 'IconAlarm',
    isAnyOf: { status: ['EXPIRING', 'EXPIRED'] },
    fields: [
      'name',
      'vendor',
      'status',
      'expirationDate',
      'renewalNoticeDate',
      'autoRenew',
      'annualValue',
      'owner',
    ],
  },
  'obligations-all': {
    object: 'contractObligation',
    name: 'All obligations',
    icon: 'IconList',
    fields: [
      'name',
      'contract',
      'party',
      'category',
      'status',
      'frequency',
      'dueDate',
    ],
  },
  'frameworks-all': {
    object: 'framework',
    name: 'All frameworks',
    icon: 'IconList',
    fields: [
      'name',
      'provider',
      'kind',
      'scope',
      'requirementCount',
      'coveragePercent',
      'compliancePercent',
      'version',
    ],
  },
  'requirements-all': {
    object: 'requirement',
    name: 'All requirements',
    icon: 'IconList',
    fields: [
      'name',
      'framework',
      'section',
      'complianceStatus',
      'controlCount',
      'statement',
      'assessable',
    ],
  },
  'requirements-gaps': {
    object: 'requirement',
    name: 'Compliance gaps',
    icon: 'IconAlertTriangle',
    isAnyOf: { complianceStatus: ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT'] },
    fields: [
      'name',
      'framework',
      'section',
      'complianceStatus',
      'controlCount',
      'statement',
    ],
  },
  'policies-all': {
    object: 'policy',
    name: 'All policies',
    icon: 'IconList',
    fields: [
      'name',
      'refId',
      'status',
      'category',
      'version',
      'owner',
      'approver',
      'nextReviewDate',
      'attestationRate',
    ],
  },
  'policies-lifecycle': {
    object: 'policy',
    name: 'Policy lifecycle',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'category', 'version', 'nextReviewDate', 'owner'],
  },
  'controls-all': {
    object: 'control',
    name: 'All controls',
    icon: 'IconList',
    fields: [
      'name',
      'refId',
      'status',
      'effectiveness',
      'domain',
      'controlType',
      'automation',
      'testFrequency',
      'lastTestedAt',
      'nextTestDue',
      'policy',
      'owner',
    ],
  },
  'controls-board': {
    object: 'control',
    name: 'Implementation board',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'domain', 'effectiveness', 'owner'],
  },
  'controls-attention': {
    object: 'control',
    name: 'Failing controls',
    icon: 'IconAlertTriangle',
    isAnyOf: { effectiveness: ['INEFFECTIVE', 'PARTIALLY_EFFECTIVE'] },
    fields: [
      'name',
      'refId',
      'effectiveness',
      'status',
      'domain',
      'lastTestedAt',
      'owner',
    ],
  },
  'mappings-all': {
    object: 'controlRequirement',
    name: 'All mappings',
    icon: 'IconList',
    fields: ['name', 'control', 'requirement', 'origin'],
  },
  'tests-all': {
    object: 'controlTest',
    name: 'All tests',
    icon: 'IconList',
    sortDescendingBy: 'performedAt',
    fields: [
      'name',
      'control',
      'result',
      'performedAt',
      'period',
      'tester',
      'sampleSize',
      'exceptionCount',
    ],
  },
  'evidence-all': {
    object: 'evidence',
    name: 'All evidence',
    icon: 'IconList',
    fields: [
      'name',
      'control',
      'status',
      'kind',
      'source',
      'collectedAt',
      'validUntil',
    ],
  },
  'evidence-board': {
    object: 'evidence',
    name: 'Collection board',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'control', 'source', 'validUntil'],
  },
  'exceptions-all': {
    object: 'policyException',
    name: 'All exceptions',
    icon: 'IconList',
    fields: [
      'name',
      'status',
      'policy',
      'control',
      'riskLevel',
      'requestedBy',
      'approvedBy',
      'expiresAt',
    ],
  },
  'assets-all': {
    object: 'asset',
    name: 'All assets',
    icon: 'IconList',
    fields: [
      'name',
      'kind',
      'criticality',
      'dataClassification',
      'ownerTeam',
      'vendor',
    ],
  },
  'risks-register': {
    object: 'risk',
    name: 'Risk register',
    icon: 'IconList',
    sortDescendingBy: 'residualScore',
    fields: [
      'name',
      'refId',
      'category',
      'inherentLevel',
      'inherentScore',
      'residualLevel',
      'residualScore',
      'treatment',
      'status',
      'owner',
      'reviewDate',
    ],
  },
  'risks-by-level': {
    object: 'risk',
    name: 'By residual level',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'residualLevel',
    fields: ['name', 'category', 'residualScore', 'treatment', 'owner'],
  },
  'risks-treatment': {
    object: 'risk',
    name: 'Treatment board',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'residualLevel', 'treatment', 'owner'],
  },
  'mitigations-all': {
    object: 'riskControl',
    name: 'All mitigations',
    icon: 'IconList',
    fields: ['name', 'risk', 'control'],
  },
  'audits-all': {
    object: 'audit',
    name: 'All audits',
    icon: 'IconList',
    fields: [
      'name',
      'status',
      'kind',
      'framework',
      'auditor',
      'startDate',
      'endDate',
    ],
  },
  'findings-all': {
    object: 'finding',
    name: 'All findings',
    icon: 'IconList',
    fields: [
      'name',
      'refId',
      'severity',
      'status',
      'source',
      'dueDate',
      'vendor',
      'control',
      'audit',
      'owner',
    ],
  },
  'findings-board': {
    object: 'finding',
    name: 'Remediation board',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'severity', 'source', 'dueDate', 'owner'],
  },
  'findings-urgent': {
    object: 'finding',
    name: 'Open high and critical',
    icon: 'IconFlame',
    isAnyOf: {
      severity: ['HIGH', 'CRITICAL'],
      status: ['OPEN', 'IN_REMEDIATION', 'READY_FOR_VALIDATION'],
    },
    fields: [
      'name',
      'severity',
      'status',
      'source',
      'dueDate',
      'vendor',
      'control',
      'owner',
    ],
  },
  'incidents-all': {
    object: 'incident',
    name: 'All incidents',
    icon: 'IconList',
    fields: [
      'name',
      'refId',
      'severity',
      'status',
      'category',
      'detectedAt',
      'resolvedAt',
      'notifiable',
      'vendor',
      'asset',
    ],
  },
  'incidents-board': {
    object: 'incident',
    name: 'Response board',
    icon: 'IconLayoutKanban',
    layout: 'KANBAN',
    groupBy: 'status',
    fields: ['name', 'severity', 'category', 'detectedAt'],
  },
} satisfies Record<string, ViewSpec>;

export type ViewKey = keyof typeof VIEW_SPECS;

export const viewId = (key: ViewKey) => uid(`view.${key}`);

const selectOptionsOf = (object: ObjectKey, fieldName: string) => {
  const field = OBJECT_SPECS[object].fields.find(
    (candidate) => candidate.name === fieldName,
  );

  if (field?.kind !== 'SELECT') {
    throw new Error(`${object}.${fieldName} is not a select field`);
  }

  return field.options;
};

export const buildView = (key: ViewKey): ViewDefinition => {
  const spec: ViewSpec = VIEW_SPECS[key];
  const id = viewId(key);
  const siblingKeys = Object.keys(VIEW_SPECS).filter(
    (candidate) => VIEW_SPECS[candidate as ViewKey].object === spec.object,
  );

  return {
    universalIdentifier: id,
    name: spec.name,
    objectUniversalIdentifier: objectId(spec.object),
    type: ViewType[spec.layout ?? 'TABLE'],
    icon: spec.icon,
    position: siblingKeys.indexOf(key),
    ...(spec.groupBy
      ? {
          mainGroupByFieldMetadataUniversalIdentifier: fieldId(
            spec.object,
            spec.groupBy,
          ),
          groups: selectOptionsOf(spec.object, spec.groupBy).map(
            ([value], position) => ({
              universalIdentifier: uid(`view.${key}.group.${value}`),
              fieldValue: value,
              position,
              isVisible: true,
            }),
          ),
        }
      : {}),
    ...(spec.calendarField
      ? {
          calendarLayout: ViewCalendarLayout.MONTH,
          calendarFieldMetadataUniversalIdentifier: fieldId(
            spec.object,
            spec.calendarField,
          ),
        }
      : {}),
    fields: spec.fields.map((fieldName, position) => ({
      universalIdentifier: uid(`view.${key}.field.${fieldName}`),
      fieldMetadataUniversalIdentifier: fieldId(spec.object, fieldName),
      position,
      isVisible: true,
      size: FIELD_SIZES[fieldName] ?? 160,
    })),
    filters: Object.entries(spec.isAnyOf ?? {}).map(([fieldName, values]) => ({
      universalIdentifier: uid(`view.${key}.filter.${fieldName}`),
      fieldMetadataUniversalIdentifier: fieldId(spec.object, fieldName),
      operand: ViewFilterOperand.IS,
      value: JSON.stringify(values),
    })),
    sorts: spec.sortDescendingBy
      ? [
          {
            universalIdentifier: uid(`view.${key}.sort`),
            fieldMetadataUniversalIdentifier: fieldId(
              spec.object,
              spec.sortDescendingBy,
            ),
            direction: ViewSortDirection.DESC,
          },
        ]
      : [],
  };
};
