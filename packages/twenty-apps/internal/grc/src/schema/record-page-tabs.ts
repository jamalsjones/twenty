import {
  type definePageLayoutTab,
  getSystemRecordPageLayoutUniversalIdentifier,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  FRONT_COMPONENT_IDS,
} from '../constants';
import { objectId, uid } from './dsl';
import { type ObjectKey } from './objects';

type TabDefinition = Parameters<typeof definePageLayoutTab>[0];

// Built-in tabs sit at 10 (Home), 20 (Timeline), 30... so 15 is second.
const POSITION_AFTER_HOME_TAB = 15;

// Adds one custom tab to the record page Twenty generates for an object,
// keeping the built-in fields, timeline, tasks, notes and files tabs.
export const buildRecordPageTab = (
  object: ObjectKey,
  frontComponent: keyof typeof FRONT_COMPONENT_IDS,
  title: string,
  icon: string,
): TabDefinition => ({
  universalIdentifier: uid(`layout.${object}.tab.${frontComponent}`),
  pageLayoutUniversalIdentifier: getSystemRecordPageLayoutUniversalIdentifier({
    objectMetadataApplicationUniversalIdentifier:
      APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier: objectId(object),
  }),
  title,
  position: POSITION_AFTER_HOME_TAB,
  icon,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: uid(`layout.${object}.widget.${frontComponent}`),
      title,
      type: 'FRONT_COMPONENT',
      heightBehavior: 'TAB_VIEWPORT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS[frontComponent],
      },
    },
  ],
});
