import { defineSkill } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';

export const VENDOR_RISK_REVIEW_SKILL_ID = uid('skill.vendor-risk-review');

export default defineSkill({
  universalIdentifier: VENDOR_RISK_REVIEW_SKILL_ID,
  name: 'grc-vendor-risk-review',
  label: 'Vendor risk review',
  description: 'How to review a vendor assessment and summarize its risk',
  icon: 'IconBuildingStore',
  content: `Use this when asked to review, summarize or decide on a vendor.

1. Read the vendor record: criticality, data shared, data types, system access, inherent risk, tier and certifications.
2. Read the latest vendor assessment and its responses. Group gaps (answers "No" or "Partially") by section.
3. Read the vendor's active contracts and note which protective clauses are present. For a vendor that receives confidential or restricted data, data processing terms, breach notification, right to audit and data return are expected.
4. Read open findings and incidents linked to the vendor.

Write the summary in this order: one-sentence recommendation (approve, approve with conditions, reject), the three gaps that matter most and why, missing contract protections, and the conditions or remediation you would require with a suggested due date.

Rules: quote the question reference (for example IAM.02) for every gap you cite. Never state that a vendor holds a certification unless it is on the record. If an assessment has unanswered questions, say how many and do not treat them as passed.`,
});
