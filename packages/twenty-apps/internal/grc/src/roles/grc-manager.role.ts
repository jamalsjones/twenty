import { defineRole } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';

export default defineRole({
  universalIdentifier: uid('role.grc-manager'),
  label: 'GRC manager',
  description: 'Runs the GRC program: full access to every GRC record',
  icon: 'IconShieldStar',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: true,
  canBeAssignedToApiKeys: true,
});
