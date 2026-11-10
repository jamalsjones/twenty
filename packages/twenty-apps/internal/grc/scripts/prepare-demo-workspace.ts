// Optional, demo only: removes the CRM entries (Companies, People, ...) from
// the sidebar so only the GRC navigation remains. The objects themselves are
// untouched and can be re-added from the sidebar's edit mode.
const API_URL = process.env.TWENTY_API_URL ?? 'http://127.0.0.1:3000';
const API_KEY = process.env.TWENTY_API_KEY;

type NavigationMenuItem = {
  id: string;
  name: string | null;
  type: string;
  folderId: string | null;
  applicationId: string | null;
};

const metadata = async <TData>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<TData> => {
  const response = await fetch(`${API_URL}/metadata`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as {
    data?: TData;
    errors?: { message: string }[];
  };

  if (!body.data || body.errors) {
    throw new Error(body.errors?.[0]?.message ?? 'Metadata request failed');
  }

  return body.data;
};

const prepare = async () => {
  const { navigationMenuItems } = await metadata<{
    navigationMenuItems: NavigationMenuItem[];
  }>('{ navigationMenuItems { id name type folderId applicationId } }');
  const overview = navigationMenuItems.find(
    (item) => item.name === 'GRC overview',
  );

  if (!overview) {
    throw new Error('The GRC app is not installed in this workspace');
  }

  const grcIds = new Set(
    navigationMenuItems
      .filter((item) => item.applicationId === overview.applicationId)
      .map((item) => item.id),
  );
  const others = navigationMenuItems.filter(
    (item) => !grcIds.has(item.id) && !grcIds.has(item.folderId ?? ''),
  );

  for (const item of others) {
    await metadata(
      'mutation ($id: UUID!) { deleteNavigationMenuItem(id: $id) { id } }',
      { id: item.id },
    );
  }

  console.log(`Removed ${others.length} sidebar entries`);
};

prepare().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
