import { defineRole } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';

export default defineRole({
  universalIdentifier: uid('role.auditor'),
  label: 'Auditor',
  description: 'Read-only access for internal and external auditors',
  icon: 'IconZoomCheck',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: true,
});
