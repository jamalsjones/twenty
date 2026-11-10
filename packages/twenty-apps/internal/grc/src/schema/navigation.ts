import {
  type defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { PAGE_LAYOUT_IDS } from '../constants';
import { uid } from './dsl';
import { type ViewKey, viewId } from './views';

type NavigationDefinition = Parameters<typeof defineNavigationMenuItem>[0];

type FolderSpec = {
  name: string;
  icon: string;
  color: string;
  items: ViewKey[];
};

const FOLDERS = {
  'third-party': {
    name: 'Third-party risk',
    icon: 'IconBuildingStore',
    color: 'orange',
    items: [
      'vendors-all',
      'assessments-pipeline',
      'contracts-all',
      'obligations-all',
    ],
  },
  compliance: {
    name: 'Compliance',
    icon: 'IconShieldCheck',
    color: 'green',
    items: [
      'frameworks-all',
      'requirements-all',
      'controls-all',
      'tests-all',
      'evidence-all',
    ],
  },
  policies: {
    name: 'Policies',
    icon: 'IconFileDescription',
    color: 'blue',
    items: ['policies-all', 'exceptions-all'],
  },
  risk: {
    name: 'Risk',
    icon: 'IconAlertTriangle',
    color: 'red',
    items: ['risks-register', 'assets-all', 'incidents-all'],
  },
  assurance: {
    name: 'Assurance',
    icon: 'IconZoomCheck',
    color: 'purple',
    items: ['audits-all', 'findings-all'],
  },
} satisfies Record<string, FolderSpec>;

export type FolderKey = keyof typeof FOLDERS;

const FOLDER_KEYS = Object.keys(FOLDERS) as FolderKey[];

// Negative positions keep the GRC entries above whatever else the workspace
// already has in its sidebar.
const FIRST_POSITION = -100;

const folderId = (key: FolderKey) => uid(`navigation.folder.${key}`);

export const buildOverviewNavigationItem = (): NavigationDefinition => ({
  universalIdentifier: uid('navigation.overview'),
  name: 'GRC overview',
  icon: 'IconLayoutDashboard',
  color: 'green',
  position: FIRST_POSITION,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: PAGE_LAYOUT_IDS.commandCenter,
});

export const buildFolder = (key: FolderKey): NavigationDefinition => ({
  universalIdentifier: folderId(key),
  name: FOLDERS[key].name,
  icon: FOLDERS[key].icon,
  color: FOLDERS[key].color,
  position: FIRST_POSITION + 1 + FOLDER_KEYS.indexOf(key),
  type: NavigationMenuItemType.FOLDER,
});

export const buildViewNavigationItem = (
  view: ViewKey,
): NavigationDefinition => {
  const folderKey = FOLDER_KEYS.find((key) =>
    (FOLDERS[key].items as ViewKey[]).includes(view),
  );

  if (!folderKey) {
    throw new Error(`View "${view}" is not listed in any navigation folder`);
  }

  return {
    universalIdentifier: uid(`navigation.view.${view}`),
    position: (FOLDERS[folderKey].items as ViewKey[]).indexOf(view),
    type: NavigationMenuItemType.VIEW,
    viewUniversalIdentifier: viewId(view),
    folderUniversalIdentifier: folderId(folderKey),
  };
};
