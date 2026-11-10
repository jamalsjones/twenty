import { defineSkill } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';

export const POLICY_DRAFTING_SKILL_ID = uid('skill.policy-drafting');

export default defineSkill({
  universalIdentifier: POLICY_DRAFTING_SKILL_ID,
  name: 'grc-policy-drafting',
  label: 'Policy drafting',
  description: 'How to draft or revise a policy so it maps to controls',
  icon: 'IconFileDescription',
  content: `Use this when asked to draft, revise or review a policy.

Structure every policy as: Purpose, Scope, Roles and responsibilities, Policy statements, Exceptions, Enforcement, Review cycle.

Policy statements must be testable. Write "Access to production systems is reviewed quarterly by the system owner", not "Access should be appropriately managed". Each statement should correspond to a control: look up the controls already linked to the policy and reuse their wording, and list any statement that has no control as a gap for the policy owner.

Keep requirements at the policy level and leave procedures (tools, steps, screenshots) out. Use "must" for requirements and "should" only for recommendations. Refer to roles, not named people.

When revising, show what changed and why, and propose the next version number: a minor bump for clarifications, a major bump when a requirement is added, removed or changed.`,
});
