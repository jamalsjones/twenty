import { type ObjectKey } from '../src/schema/objects';

type RelatedList = {
  label: string;
  objectKey: ObjectKey;
  foreignKey: string;
  columns: string[];
};

export type ObjectView = {
  title: string;
  description: string;
  columns: string[];
  filters: string[];
  // The select field that drives the workflow stepper on the record page.
  stageField?: string;
  sections: { title: string; fields: string[] }[];
  related: RelatedList[];
  createFields?: string[];
};

export const NAVIGATION: { label: string; items: ObjectKey[] }[] = [
  {
    label: 'Third-party risk',
    items: ['vendor', 'vendorAssessment', 'contract', 'contractObligation'],
  },
  {
    label: 'Compliance',
    items: ['framework', 'control', 'controlTest', 'evidence'],
  },
  { label: 'Policies', items: ['policy', 'policyException'] },
  { label: 'Risk', items: ['risk', 'asset', 'incident'] },
  { label: 'Assurance', items: ['audit', 'finding'] },
];

const FINDING_COLUMNS = ['name', 'severity', 'status', 'dueDate'];

export const OBJECT_VIEWS: Partial<Record<ObjectKey, ObjectView>> = {
  vendor: {
    title: 'Vendor register',
    description:
      'Every third party, tiered by inherent risk and tracked through due diligence.',
    columns: [
      'name',
      'status',
      'tier',
      'inherentRisk',
      'residualRisk',
      'securityScore',
      'category',
      'dataClassification',
      'annualSpend',
      'nextReviewDate',
      'owner',
    ],
    filters: ['status', 'tier', 'residualRisk', 'category'],
    stageField: 'status',
    sections: [
      {
        title: 'Risk intake',
        fields: [
          'criticality',
          'dataClassification',
          'dataTypes',
          'systemAccess',
          'certifications',
        ],
      },
      {
        title: 'Profile',
        fields: [
          'category',
          'serviceDescription',
          'country',
          'website',
          'annualSpend',
          'contactName',
          'contactEmail',
          'owner',
          'lastAssessedAt',
          'nextReviewDate',
        ],
      },
    ],
    related: [
      {
        label: 'Assessments',
        objectKey: 'vendorAssessment',
        foreignKey: 'vendorId',
        columns: ['name', 'stage', 'score', 'riskRating', 'dueDate'],
      },
      {
        label: 'Contracts',
        objectKey: 'contract',
        foreignKey: 'vendorId',
        columns: [
          'name',
          'contractType',
          'status',
          'annualValue',
          'expirationDate',
        ],
      },
      {
        label: 'Findings',
        objectKey: 'finding',
        foreignKey: 'vendorId',
        columns: FINDING_COLUMNS,
      },
      {
        label: 'Risks',
        objectKey: 'risk',
        foreignKey: 'vendorId',
        columns: ['name', 'residualLevel', 'treatment', 'status'],
      },
      {
        label: 'Incidents',
        objectKey: 'incident',
        foreignKey: 'vendorId',
        columns: ['name', 'severity', 'status', 'detectedAt'],
      },
    ],
    createFields: [
      'name',
      'serviceDescription',
      'category',
      'criticality',
      'dataClassification',
      'systemAccess',
      'dataTypes',
    ],
  },
  vendorAssessment: {
    title: 'Vendor assessments',
    description: 'Due diligence reviews, from questionnaire to decision.',
    columns: [
      'name',
      'vendor',
      'stage',
      'assessmentType',
      'score',
      'riskRating',
      'answeredCount',
      'questionCount',
      'dueDate',
      'owner',
    ],
    filters: ['stage', 'riskRating'],
    stageField: 'stage',
    sections: [
      {
        title: 'Assessment',
        fields: [
          'vendor',
          'assessmentType',
          'questionnaire',
          'dueDate',
          'sentAt',
          'submittedAt',
          'completedAt',
          'riskRating',
          'owner',
          'summary',
        ],
      },
    ],
    related: [
      {
        label: 'Findings raised',
        objectKey: 'finding',
        foreignKey: 'assessmentId',
        columns: FINDING_COLUMNS,
      },
    ],
  },
  contract: {
    title: 'Contract register',
    description: 'Agreements, key terms, protective clauses and renewal dates.',
    columns: [
      'name',
      'reference',
      'vendor',
      'contractType',
      'status',
      'annualValue',
      'expirationDate',
      'renewalNoticeDate',
      'autoRenew',
      'riskRating',
      'owner',
    ],
    filters: ['status', 'contractType', 'riskRating'],
    stageField: 'status',
    sections: [
      {
        title: 'Commercial terms',
        fields: [
          'vendor',
          'contractType',
          'reference',
          'totalValue',
          'annualValue',
          'effectiveDate',
          'expirationDate',
          'renewalNoticeDate',
          'autoRenew',
          'noticePeriodDays',
          'termMonths',
          'owner',
        ],
      },
      {
        title: 'Risk terms',
        fields: [
          'clauses',
          'breachNotificationHours',
          'liabilityCap',
          'governingLaw',
          'riskRating',
          'summary',
        ],
      },
    ],
    related: [
      {
        label: 'Obligations',
        objectKey: 'contractObligation',
        foreignKey: 'contractId',
        columns: ['name', 'party', 'category', 'status', 'dueDate'],
      },
      {
        label: 'Findings',
        objectKey: 'finding',
        foreignKey: 'contractId',
        columns: FINDING_COLUMNS,
      },
    ],
  },
  contractObligation: {
    title: 'Contract obligations',
    description: 'Commitments each party must meet, with their next due date.',
    columns: [
      'name',
      'contract',
      'party',
      'category',
      'status',
      'frequency',
      'dueDate',
    ],
    filters: ['status', 'party', 'category'],
    stageField: 'status',
    sections: [
      {
        title: 'Obligation',
        fields: [
          'contract',
          'party',
          'category',
          'frequency',
          'dueDate',
          'details',
        ],
      },
    ],
    related: [],
  },
  framework: {
    title: 'Frameworks',
    description:
      'Standards and regulations in scope, with control coverage and compliance.',
    columns: [
      'name',
      'provider',
      'kind',
      'scope',
      'requirementCount',
      'coveragePercent',
      'compliancePercent',
    ],
    filters: ['kind', 'scope'],
    sections: [
      {
        title: 'Framework',
        fields: [
          'refId',
          'provider',
          'kind',
          'scope',
          'version',
          'summary',
          'copyright',
        ],
      },
    ],
    related: [
      {
        label: 'Audits',
        objectKey: 'audit',
        foreignKey: 'frameworkId',
        columns: ['name', 'kind', 'status', 'startDate'],
      },
    ],
  },
  requirement: {
    title: 'Requirements',
    description: 'Individual clauses and criteria.',
    columns: ['refId', 'name', 'framework', 'complianceStatus', 'controlCount'],
    filters: ['complianceStatus'],
    sections: [
      {
        title: 'Requirement',
        fields: [
          'framework',
          'refId',
          'section',
          'statement',
          'complianceStatus',
          'controlCount',
        ],
      },
    ],
    related: [
      {
        label: 'Mapped controls',
        objectKey: 'controlRequirement',
        foreignKey: 'requirementId',
        columns: ['control', 'origin'],
      },
    ],
  },
  controlRequirement: {
    title: 'Control mappings',
    description: 'Links between controls and requirements.',
    columns: ['name', 'control', 'requirement', 'origin'],
    filters: ['origin'],
    sections: [
      { title: 'Mapping', fields: ['control', 'requirement', 'origin'] },
    ],
    related: [],
  },
  control: {
    title: 'Control library',
    description:
      'Safeguards in operation, their test results and what they cover.',
    columns: [
      'refId',
      'name',
      'status',
      'effectiveness',
      'domain',
      'controlType',
      'automation',
      'testFrequency',
      'lastTestedAt',
      'nextTestDue',
      'owner',
    ],
    filters: ['status', 'effectiveness', 'domain'],
    stageField: 'status',
    sections: [
      {
        title: 'Control',
        fields: [
          'statement',
          'domain',
          'controlType',
          'automation',
          'effectiveness',
          'testFrequency',
          'lastTestedAt',
          'nextTestDue',
          'policy',
          'owner',
        ],
      },
    ],
    related: [
      {
        label: 'Tests',
        objectKey: 'controlTest',
        foreignKey: 'controlId',
        columns: ['name', 'result', 'performedAt', 'tester', 'exceptionCount'],
      },
      {
        label: 'Evidence',
        objectKey: 'evidence',
        foreignKey: 'controlId',
        columns: ['name', 'status', 'source', 'collectedAt', 'validUntil'],
      },
      {
        label: 'Requirements covered',
        objectKey: 'controlRequirement',
        foreignKey: 'controlId',
        columns: ['requirement', 'origin'],
      },
      {
        label: 'Risks mitigated',
        objectKey: 'riskControl',
        foreignKey: 'controlId',
        columns: ['risk'],
      },
      {
        label: 'Findings',
        objectKey: 'finding',
        foreignKey: 'controlId',
        columns: FINDING_COLUMNS,
      },
      {
        label: 'Exceptions',
        objectKey: 'policyException',
        foreignKey: 'controlId',
        columns: ['name', 'status', 'riskLevel', 'expiresAt'],
      },
    ],
  },
  controlTest: {
    title: 'Control tests',
    description:
      'Test executions. Recording one updates the control and raises a finding on failure.',
    columns: [
      'name',
      'control',
      'result',
      'performedAt',
      'period',
      'tester',
      'sampleSize',
      'exceptionCount',
    ],
    filters: ['result'],
    sections: [
      {
        title: 'Test',
        fields: [
          'control',
          'result',
          'performedAt',
          'period',
          'tester',
          'sampleSize',
          'exceptionCount',
          'notes',
        ],
      },
    ],
    related: [],
    createFields: [
      'name',
      'control',
      'result',
      'performedAt',
      'tester',
      'notes',
    ],
  },
  evidence: {
    title: 'Evidence',
    description:
      'Artifacts that prove controls operate, and when they go stale.',
    columns: [
      'name',
      'control',
      'status',
      'kind',
      'source',
      'collectedAt',
      'validUntil',
    ],
    filters: ['status', 'kind'],
    stageField: 'status',
    sections: [
      {
        title: 'Evidence',
        fields: [
          'control',
          'kind',
          'source',
          'collectedAt',
          'validUntil',
          'sourceLink',
        ],
      },
    ],
    related: [],
  },
  policy: {
    title: 'Policy library',
    description: 'Governing documents, their owners and review cycle.',
    columns: [
      'refId',
      'name',
      'status',
      'category',
      'version',
      'owner',
      'nextReviewDate',
      'attestationRate',
    ],
    filters: ['status', 'category'],
    stageField: 'status',
    sections: [
      {
        title: 'Policy',
        fields: [
          'refId',
          'category',
          'version',
          'summary',
          'approver',
          'owner',
          'effectiveDate',
          'lastReviewedAt',
          'nextReviewDate',
          'reviewCycleMonths',
          'attestationRate',
        ],
      },
    ],
    related: [
      {
        label: 'Controls',
        objectKey: 'control',
        foreignKey: 'policyId',
        columns: ['refId', 'name', 'status', 'effectiveness'],
      },
      {
        label: 'Exceptions',
        objectKey: 'policyException',
        foreignKey: 'policyId',
        columns: ['name', 'status', 'riskLevel', 'expiresAt'],
      },
    ],
  },
  policyException: {
    title: 'Exceptions',
    description: 'Approved, time-boxed deviations from policy.',
    columns: [
      'name',
      'status',
      'policy',
      'control',
      'riskLevel',
      'requestedBy',
      'approvedBy',
      'expiresAt',
    ],
    filters: ['status', 'riskLevel'],
    stageField: 'status',
    sections: [
      {
        title: 'Exception',
        fields: [
          'policy',
          'control',
          'riskLevel',
          'requestedBy',
          'approvedBy',
          'expiresAt',
          'justification',
          'compensatingControls',
        ],
      },
    ],
    related: [],
  },
  risk: {
    title: 'Risk register',
    description: 'Risk scenarios scored before and after controls.',
    columns: [
      'refId',
      'name',
      'category',
      'inherentLevel',
      'residualLevel',
      'residualScore',
      'treatment',
      'status',
      'owner',
      'reviewDate',
    ],
    filters: ['status', 'category', 'residualLevel', 'treatment'],
    stageField: 'status',
    sections: [
      {
        title: 'Scoring',
        fields: [
          'inherentLikelihood',
          'inherentImpact',
          'inherentLevel',
          'residualLikelihood',
          'residualImpact',
          'residualLevel',
        ],
      },
      {
        title: 'Treatment',
        fields: [
          'category',
          'scenario',
          'treatment',
          'treatmentPlan',
          'reviewDate',
          'vendor',
          'asset',
          'owner',
        ],
      },
    ],
    related: [
      {
        label: 'Mitigating controls',
        objectKey: 'riskControl',
        foreignKey: 'riskId',
        columns: ['control'],
      },
    ],
    createFields: [
      'name',
      'category',
      'scenario',
      'inherentLikelihood',
      'inherentImpact',
      'residualLikelihood',
      'residualImpact',
      'treatment',
    ],
  },
  riskControl: {
    title: 'Risk mitigations',
    description: 'Links between risks and controls.',
    columns: ['name', 'risk', 'control'],
    filters: [],
    sections: [{ title: 'Mitigation', fields: ['risk', 'control'] }],
    related: [],
  },
  asset: {
    title: 'Assets',
    description: 'Systems, data stores and processes that risks apply to.',
    columns: [
      'name',
      'kind',
      'criticality',
      'dataClassification',
      'ownerTeam',
      'vendor',
    ],
    filters: ['kind', 'criticality'],
    sections: [
      {
        title: 'Asset',
        fields: [
          'kind',
          'criticality',
          'dataClassification',
          'ownerTeam',
          'vendor',
          'details',
        ],
      },
    ],
    related: [
      {
        label: 'Risks',
        objectKey: 'risk',
        foreignKey: 'assetId',
        columns: ['name', 'residualLevel', 'status'],
      },
      {
        label: 'Incidents',
        objectKey: 'incident',
        foreignKey: 'assetId',
        columns: ['name', 'severity', 'status'],
      },
    ],
  },
  incident: {
    title: 'Incidents',
    description: 'Security and privacy incidents and their handling.',
    columns: [
      'refId',
      'name',
      'severity',
      'status',
      'category',
      'detectedAt',
      'notifiable',
      'vendor',
    ],
    filters: ['status', 'severity', 'category'],
    stageField: 'status',
    sections: [
      {
        title: 'Incident',
        fields: [
          'severity',
          'category',
          'detectedAt',
          'resolvedAt',
          'notifiable',
          'notificationDeadline',
          'impact',
          'rootCause',
          'vendor',
          'asset',
        ],
      },
    ],
    related: [],
  },
  audit: {
    title: 'Audits',
    description: 'Internal and external audit engagements.',
    columns: [
      'name',
      'status',
      'kind',
      'framework',
      'auditor',
      'startDate',
      'endDate',
    ],
    filters: ['status', 'kind'],
    stageField: 'status',
    sections: [
      {
        title: 'Engagement',
        fields: [
          'kind',
          'framework',
          'auditor',
          'startDate',
          'endDate',
          'scope',
        ],
      },
    ],
    related: [
      {
        label: 'Findings',
        objectKey: 'finding',
        foreignKey: 'auditId',
        columns: FINDING_COLUMNS,
      },
    ],
  },
  finding: {
    title: 'Findings',
    description:
      'Issues to remediate from audits, tests, vendor reviews, incidents and monitoring.',
    columns: [
      'name',
      'severity',
      'status',
      'source',
      'dueDate',
      'vendor',
      'control',
      'owner',
    ],
    filters: ['status', 'severity', 'source'],
    stageField: 'status',
    sections: [
      {
        title: 'Finding',
        fields: [
          'severity',
          'source',
          'details',
          'remediationPlan',
          'dueDate',
          'closedAt',
          'vendor',
          'control',
          'audit',
          'assessment',
          'contract',
          'owner',
        ],
      },
    ],
    related: [],
    createFields: [
      'name',
      'severity',
      'source',
      'details',
      'dueDate',
      'control',
      'vendor',
    ],
  },
};
