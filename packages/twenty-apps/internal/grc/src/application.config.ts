import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from './constants';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'GRC',
  description:
    'Governance, risk and compliance: third-party risk, contracts, policies, controls, frameworks, risks, audits and findings.',
});
