import { defineApplicationRole } from 'twenty-sdk/define';

import { uid } from '../schema/dsl';

export default defineApplicationRole({
  universalIdentifier: uid('role.application'),
  label: 'GRC automation',
  description: 'Role the GRC logic functions and components run as',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
