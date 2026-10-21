import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { BackfillWorkspaceApplicationDefaultRolesCommand } from 'src/database/commands/upgrade-version-command/2-51/2-51-workspace-command-1792575029384-backfill-workspace-application-default-roles.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import {
  WORKSPACE_CUSTOM_APPLICATION_ROLE_LABEL,
  WORKSPACE_CUSTOM_APPLICATION_ROLE_UNIVERSAL_IDENTIFIER,
} from 'src/engine/core-modules/application/constants/workspace-custom-application-role.constant';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const STANDARD_APPLICATION_ID = '20202020-0000-4000-8000-0000000000a1';
const CUSTOM_APPLICATION_ID = '20202020-0000-4000-8000-0000000000a2';
const ADMIN_ROLE_ID = 'role-admin';

type FakeApplication = {
  id: string;
  universalIdentifier: string;
  defaultRoleId: string | null;
};

type RoleMigrationArgs = {
  allFlatEntityOperationByMetadataName: {
    role: { flatEntityToCreate: FlatRole[] };
  };
  isSystemBuild: boolean;
  applicationUniversalIdentifier: string;
};

const buildExistingRole = ({
  id,
  universalIdentifier,
  label,
}: {
  id: string;
  universalIdentifier: string;
  label: string;
}): FlatRole => ({ id, universalIdentifier, label }) as FlatRole;

describe('BackfillWorkspaceApplicationDefaultRolesCommand', () => {
  let applications: Record<string, FakeApplication>;
  let roles: FlatRole[];
  let migrationCalls: RoleMigrationArgs[];
  let command: BackfillWorkspaceApplicationDefaultRolesCommand;

  const getCustomApplicationRole = () =>
    roles.find(
      (role) =>
        role.universalIdentifier ===
        WORKSPACE_CUSTOM_APPLICATION_ROLE_UNIVERSAL_IDENTIFIER,
    );

  beforeEach(() => {
    applications = {
      [STANDARD_APPLICATION_ID]: {
        id: STANDARD_APPLICATION_ID,
        universalIdentifier: TWENTY_STANDARD_APPLICATION.universalIdentifier,
        defaultRoleId: null,
      },
      [CUSTOM_APPLICATION_ID]: {
        id: CUSTOM_APPLICATION_ID,
        universalIdentifier: CUSTOM_APPLICATION_ID,
        defaultRoleId: null,
      },
    };
    roles = [
      buildExistingRole({
        id: ADMIN_ROLE_ID,
        universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
        label: 'Admin',
      }),
      buildExistingRole({
        id: 'role-member',
        universalIdentifier: 'member',
        label: 'Member',
      }),
    ];
    migrationCalls = [];

    const workspaceCacheService = {
      getOrRecompute: jest.fn(async () => ({
        flatRoleMaps: {
          byUniversalIdentifier: Object.fromEntries(
            roles.map((role) => [role.universalIdentifier, role]),
          ),
        },
      })),
    } as unknown as WorkspaceCacheService;

    const applicationService = {
      findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest.fn(
        async () => ({
          twentyStandardFlatApplication: {
            ...applications[STANDARD_APPLICATION_ID],
          },
          workspaceCustomFlatApplication: {
            ...applications[CUSTOM_APPLICATION_ID],
          },
        }),
      ),
      update: jest.fn(
        async (id: string, { defaultRoleId }: { defaultRoleId: string }) => {
          applications[id] = { ...applications[id], defaultRoleId };
        },
      ),
    } as unknown as ApplicationService;

    const workspaceMigrationValidateBuildAndRunService = {
      validateBuildAndRunWorkspaceMigration: jest.fn(
        async (args: RoleMigrationArgs) => {
          migrationCalls.push(args);
          roles = [
            ...roles,
            ...args.allFlatEntityOperationByMetadataName.role
              .flatEntityToCreate,
          ];

          return { status: 'success' };
        },
      ),
    } as unknown as WorkspaceMigrationValidateBuildAndRunService;

    command = new BackfillWorkspaceApplicationDefaultRolesCommand(
      {} as WorkspaceIteratorService,
      workspaceCacheService,
      applicationService,
      workspaceMigrationValidateBuildAndRunService,
    );

    jest.spyOn(command['logger'], 'log').mockImplementation();
  });

  const run = (dryRun = false) =>
    command.runOnWorkspace({
      workspaceId: WORKSPACE_ID,
      options: { dryRun },
      index: 0,
      total: 1,
    });

  it('sets Admin as the standard application default role', async () => {
    await run();

    expect(applications[STANDARD_APPLICATION_ID].defaultRoleId).toBe(
      ADMIN_ROLE_ID,
    );
  });

  it('creates a locked, Admin-equivalent role owned by the custom application and sets it as its default role', async () => {
    await run();

    const customApplicationRole = getCustomApplicationRole();

    expect(customApplicationRole).toMatchObject({
      label: WORKSPACE_CUSTOM_APPLICATION_ROLE_LABEL,
      applicationId: CUSTOM_APPLICATION_ID,
      isEditable: false,
      canUpdateAllSettings: true,
      canAccessAllTools: true,
      canReadAllObjectRecords: true,
      canUpdateAllObjectRecords: true,
      canSoftDeleteAllObjectRecords: true,
      canDestroyAllObjectRecords: true,
      canBeAssignedToUsers: false,
      canBeAssignedToAgents: false,
      canBeAssignedToApiKeys: false,
    });
    expect(applications[CUSTOM_APPLICATION_ID].defaultRoleId).toBe(
      customApplicationRole?.id,
    );
    expect(migrationCalls).toMatchObject([
      {
        isSystemBuild: true,
        applicationUniversalIdentifier: CUSTOM_APPLICATION_ID,
      },
    ]);
  });

  it('changes nothing on a second run', async () => {
    await run();

    const rolesAfterFirstRun = [...roles];
    const applicationsAfterFirstRun = structuredClone(applications);

    migrationCalls = [];

    await run();

    expect(migrationCalls).toEqual([]);
    expect(roles).toEqual(rolesAfterFirstRun);
    expect(applications).toEqual(applicationsAfterFirstRun);
  });

  it('leaves an application that already has a default role alone', async () => {
    applications[STANDARD_APPLICATION_ID].defaultRoleId = 'role-member';
    applications[CUSTOM_APPLICATION_ID].defaultRoleId = 'role-member';

    await run();

    expect(applications[STANDARD_APPLICATION_ID].defaultRoleId).toBe(
      'role-member',
    );
    expect(applications[CUSTOM_APPLICATION_ID].defaultRoleId).toBe(
      'role-member',
    );
    expect(getCustomApplicationRole()).toBeUndefined();
  });

  it('picks a free label when a role already uses the default one', async () => {
    roles.push(
      buildExistingRole({
        id: 'role-taken-1',
        universalIdentifier: 'taken-1',
        label: WORKSPACE_CUSTOM_APPLICATION_ROLE_LABEL,
      }),
      buildExistingRole({
        id: 'role-taken-2',
        universalIdentifier: 'taken-2',
        label: `${WORKSPACE_CUSTOM_APPLICATION_ROLE_LABEL} 2`,
      }),
    );

    await run();

    expect(getCustomApplicationRole()?.label).toBe(
      `${WORKSPACE_CUSTOM_APPLICATION_ROLE_LABEL} 3`,
    );
  });

  it('writes nothing in dry-run mode', async () => {
    await run(true);

    expect(migrationCalls).toEqual([]);
    expect(applications[STANDARD_APPLICATION_ID].defaultRoleId).toBeNull();
    expect(applications[CUSTOM_APPLICATION_ID].defaultRoleId).toBeNull();
  });
});
