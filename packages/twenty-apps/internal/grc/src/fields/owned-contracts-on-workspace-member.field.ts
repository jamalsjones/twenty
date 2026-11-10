import { defineField } from 'twenty-sdk/define';

import { buildWorkspaceMemberField } from '../schema/build';

export default defineField(buildWorkspaceMemberField('ownedContracts'));
