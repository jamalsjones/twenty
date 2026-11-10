import { defineView } from 'twenty-sdk/define';

import { buildView } from '../schema/views';

export default defineView(buildView('risks-by-level'));
