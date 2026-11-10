import { type SelectOptionSpec } from './dsl';

export const RISK_LEVELS = [
  ['LOW', 'Low', 'green'],
  ['MEDIUM', 'Medium', 'yellow'],
  ['HIGH', 'High', 'orange'],
  ['CRITICAL', 'Critical', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const LIKELIHOOD = [
  ['L1', '1 - Rare', 'green'],
  ['L2', '2 - Unlikely', 'turquoise'],
  ['L3', '3 - Possible', 'yellow'],
  ['L4', '4 - Likely', 'orange'],
  ['L5', '5 - Almost certain', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const IMPACT = [
  ['I1', '1 - Negligible', 'green'],
  ['I2', '2 - Minor', 'turquoise'],
  ['I3', '3 - Moderate', 'yellow'],
  ['I4', '4 - Major', 'orange'],
  ['I5', '5 - Severe', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const DATA_CLASSIFICATION = [
  ['PUBLIC', 'Public', 'gray'],
  ['INTERNAL', 'Internal', 'sky'],
  ['CONFIDENTIAL', 'Confidential', 'orange'],
  ['RESTRICTED', 'Restricted', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const VENDOR_STATUS = [
  ['INTAKE', 'Intake', 'gray'],
  ['DUE_DILIGENCE', 'Due diligence', 'blue'],
  ['APPROVED', 'Approved', 'green'],
  ['CONDITIONAL', 'Approved with conditions', 'yellow'],
  ['OFFBOARDING', 'Offboarding', 'orange'],
  ['REJECTED', 'Rejected', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const VENDOR_TIER = [
  ['TIER_1', 'Tier 1 - Critical', 'red'],
  ['TIER_2', 'Tier 2 - High', 'orange'],
  ['TIER_3', 'Tier 3 - Moderate', 'yellow'],
  ['TIER_4', 'Tier 4 - Low', 'green'],
] as const satisfies readonly SelectOptionSpec[];

export const ASSESSMENT_STAGE = [
  ['SCOPING', 'Scoping', 'gray'],
  ['QUESTIONNAIRE_SENT', 'Questionnaire sent', 'sky'],
  ['IN_REVIEW', 'In review', 'blue'],
  ['REMEDIATION', 'Remediation', 'orange'],
  ['APPROVED', 'Approved', 'green'],
  ['REJECTED', 'Rejected', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const RESPONSE_ANSWER = [
  ['UNANSWERED', 'Unanswered', 'gray'],
  ['YES', 'Yes', 'green'],
  ['PARTIAL', 'Partially', 'yellow'],
  ['NO', 'No', 'red'],
  ['NOT_APPLICABLE', 'Not applicable', 'sky'],
] as const satisfies readonly SelectOptionSpec[];

export const CONTRACT_STATUS = [
  ['DRAFT', 'Draft', 'gray'],
  ['LEGAL_REVIEW', 'Legal review', 'sky'],
  ['NEGOTIATION', 'Negotiation', 'blue'],
  ['SIGNATURE', 'Out for signature', 'purple'],
  ['ACTIVE', 'Active', 'green'],
  ['EXPIRING', 'Expiring soon', 'orange'],
  ['EXPIRED', 'Expired', 'red'],
  ['TERMINATED', 'Terminated', 'pink'],
] as const satisfies readonly SelectOptionSpec[];

export const CONTRACT_TYPE = [
  ['MSA', 'MSA', 'blue'],
  ['DPA', 'DPA', 'purple'],
  ['SOW', 'SOW', 'sky'],
  ['NDA', 'NDA', 'gray'],
  ['BAA', 'BAA', 'pink'],
  ['SLA', 'SLA', 'turquoise'],
  ['ORDER_FORM', 'Order form', 'yellow'],
  ['LICENSE', 'License', 'green'],
] as const satisfies readonly SelectOptionSpec[];

export const CONTRACT_CLAUSES = [
  ['DPA', 'Data processing terms', 'purple'],
  ['SCC', 'Standard contractual clauses', 'blue'],
  ['AUDIT_RIGHT', 'Right to audit', 'green'],
  ['BREACH_NOTIFICATION', 'Breach notification', 'red'],
  ['SUBPROCESSOR_APPROVAL', 'Subprocessor approval', 'orange'],
  ['LIABILITY_CAP', 'Liability cap', 'yellow'],
  ['TERMINATION_FOR_CONVENIENCE', 'Termination for convenience', 'sky'],
  ['SLA_CREDITS', 'SLA credits', 'turquoise'],
  ['DATA_RETURN', 'Data return and deletion', 'pink'],
  ['CYBER_INSURANCE', 'Cyber insurance', 'gray'],
] as const satisfies readonly SelectOptionSpec[];

export const COMPLIANCE_STATUS = [
  ['NOT_ASSESSED', 'Not assessed', 'gray'],
  ['COMPLIANT', 'Compliant', 'green'],
  ['PARTIALLY_COMPLIANT', 'Partially compliant', 'yellow'],
  ['NON_COMPLIANT', 'Non-compliant', 'red'],
  ['NOT_APPLICABLE', 'Not applicable', 'sky'],
] as const satisfies readonly SelectOptionSpec[];

export const CONTROL_STATUS = [
  ['DRAFT', 'Draft', 'gray'],
  ['IMPLEMENTING', 'Implementing', 'blue'],
  ['OPERATIONAL', 'Operational', 'green'],
  ['NEEDS_ATTENTION', 'Needs attention', 'orange'],
  ['RETIRED', 'Retired', 'pink'],
] as const satisfies readonly SelectOptionSpec[];

export const CONTROL_EFFECTIVENESS = [
  ['NOT_TESTED', 'Not tested', 'gray'],
  ['EFFECTIVE', 'Effective', 'green'],
  ['PARTIALLY_EFFECTIVE', 'Partially effective', 'yellow'],
  ['INEFFECTIVE', 'Ineffective', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const CONTROL_DOMAIN = [
  ['GOVERNANCE', 'Governance', 'purple'],
  ['ACCESS', 'Access management', 'blue'],
  ['ASSET', 'Asset management', 'sky'],
  ['DATA', 'Data protection', 'pink'],
  ['CRYPTO', 'Cryptography', 'turquoise'],
  ['NETWORK', 'Network security', 'green'],
  ['VULNERABILITY', 'Vulnerability management', 'orange'],
  ['LOGGING', 'Logging and monitoring', 'yellow'],
  ['INCIDENT', 'Incident response', 'red'],
  ['RESILIENCE', 'Business continuity', 'gray'],
  ['CHANGE', 'Change management', 'blue'],
  ['SDLC', 'Secure development', 'purple'],
  ['PEOPLE', 'People security', 'pink'],
  ['PHYSICAL', 'Physical security', 'gray'],
  ['VENDOR', 'Third-party management', 'orange'],
  ['RISK', 'Risk management', 'red'],
] as const satisfies readonly SelectOptionSpec[];

export const FREQUENCY = [
  ['CONTINUOUS', 'Continuous', 'green'],
  ['MONTHLY', 'Monthly', 'sky'],
  ['QUARTERLY', 'Quarterly', 'blue'],
  ['SEMI_ANNUAL', 'Semi-annual', 'purple'],
  ['ANNUAL', 'Annual', 'gray'],
] as const satisfies readonly SelectOptionSpec[];

export const POLICY_STATUS = [
  ['DRAFT', 'Draft', 'gray'],
  ['IN_REVIEW', 'In review', 'blue'],
  ['APPROVED', 'Approved', 'purple'],
  ['PUBLISHED', 'Published', 'green'],
  ['RETIRED', 'Retired', 'pink'],
] as const satisfies readonly SelectOptionSpec[];

export const RISK_STATUS = [
  ['IDENTIFIED', 'Identified', 'gray'],
  ['ASSESSED', 'Assessed', 'sky'],
  ['TREATING', 'Treatment in progress', 'blue'],
  ['MONITORING', 'Monitoring', 'green'],
  ['ACCEPTED', 'Accepted', 'purple'],
  ['CLOSED', 'Closed', 'pink'],
] as const satisfies readonly SelectOptionSpec[];

export const FINDING_STATUS = [
  ['OPEN', 'Open', 'red'],
  ['IN_REMEDIATION', 'In remediation', 'blue'],
  ['READY_FOR_VALIDATION', 'Ready for validation', 'purple'],
  ['CLOSED', 'Closed', 'green'],
  ['RISK_ACCEPTED', 'Risk accepted', 'gray'],
] as const satisfies readonly SelectOptionSpec[];

export const INCIDENT_STATUS = [
  ['DETECTED', 'Detected', 'red'],
  ['TRIAGED', 'Triaged', 'orange'],
  ['CONTAINED', 'Contained', 'yellow'],
  ['RESOLVED', 'Resolved', 'blue'],
  ['POSTMORTEM', 'Post-mortem', 'purple'],
  ['CLOSED', 'Closed', 'green'],
] as const satisfies readonly SelectOptionSpec[];

export const AUDIT_STATUS = [
  ['PLANNED', 'Planned', 'gray'],
  ['FIELDWORK', 'Fieldwork', 'blue'],
  ['REPORTING', 'Reporting', 'purple'],
  ['COMPLETED', 'Completed', 'green'],
] as const satisfies readonly SelectOptionSpec[];

export const EXCEPTION_STATUS = [
  ['REQUESTED', 'Requested', 'blue'],
  ['APPROVED', 'Approved', 'green'],
  ['DENIED', 'Denied', 'red'],
  ['EXPIRED', 'Expired', 'gray'],
] as const satisfies readonly SelectOptionSpec[];
