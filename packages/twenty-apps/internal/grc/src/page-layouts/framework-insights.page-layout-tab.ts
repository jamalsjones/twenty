import { definePageLayoutTab } from 'twenty-sdk/define';

import { buildRecordPageTab } from '../schema/record-page-tabs';

export default definePageLayoutTab(
  buildRecordPageTab(
    'framework',
    'frameworkCoverage',
    'Coverage',
    'IconChartBar',
  ),
);
