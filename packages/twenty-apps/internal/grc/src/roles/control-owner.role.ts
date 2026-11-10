import { defineRole } from 'twenty-sdk/define';

import { objectId, uid } from '../schema/dsl';
import { type ObjectKey } from '../schema/objects';

const EDITABLE_OBJECTS: ObjectKey[] = [
  'control',
  'controlTest',
  'evidence',
  'finding',
  'risk',
  'policyException',
];

export default defineRole({
  universalIdentifier: uid('role.control-owner'),
  label: 'Control owner',
  description:
    'First line: reads everything, maintains their controls, evidence, risks and findings',
  icon: 'IconShieldLock',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: EDITABLE_OBJECTS.map((key) => ({
    objectUniversalIdentifier: objectId(key),
    canReadObjectRecords: true,
    canUpdateObjectRecords: true,
    canSoftDeleteObjectRecords: false,
    canDestroyObjectRecords: false,
  })),
});
