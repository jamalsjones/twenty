import { defineNavigationMenuItem } from 'twenty-sdk/define';

import { buildViewNavigationItem } from '../schema/navigation';

export default defineNavigationMenuItem(
  buildViewNavigationItem('obligations-all'),
);
