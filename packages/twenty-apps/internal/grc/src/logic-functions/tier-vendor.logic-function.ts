import { defineLogicFunction } from 'twenty-sdk/define';
import type {
  DatabaseEventPayload,
  ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import {
  inherentVendorRisk,
  TIER_BY_LEVEL,
  type VendorIntake,
} from '../domain/scoring';
import { uid } from '../schema/dsl';
import { updateRecord } from './shared/records';

type Vendor = VendorIntake & {
  inherentRisk: string | null;
  tier: string | null;
};

type VendorEvent = DatabaseEventPayload<ObjectRecordUpdateEvent<Vendor>>;

const handler = async (event: VendorEvent) => {
  const vendor = event.properties.after;
  const isWrite = /\.(created|updated)$/.test(event.name);

  if (!vendor || !isWrite) return { skipped: true };

  const inherentRisk = inherentVendorRisk(vendor);
  const tier = TIER_BY_LEVEL[inherentRisk];

  if (vendor.inherentRisk === inherentRisk && vendor.tier === tier) {
    return { skipped: true };
  }

  await updateRecord('vendors', event.recordId, { inherentRisk, tier });

  return { inherentRisk, tier };
};

export default defineLogicFunction({
  universalIdentifier: uid('function.tier-vendor'),
  name: 'tier-vendor',
  description:
    'Rates inherent risk and tier from criticality, data shared and system access',
  timeoutSeconds: 15,
  handler,
  databaseEventTriggerSettings: { eventName: 'vendor.*' },
});
