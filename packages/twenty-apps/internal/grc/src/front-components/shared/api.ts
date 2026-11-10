import { RestApiClient } from 'twenty-client-sdk/rest';

type ListResponse = {
  data: Record<string, unknown[]>;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string };
};

const PAGE_SIZE = 200;
const MAX_PAGES = 15;

const client = new RestApiClient();

export const listRecords = async <TRecord>(
  objectNamePlural: string,
  query: { filter?: string; orderBy?: string } = {},
): Promise<TRecord[]> => {
  const records: TRecord[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = (await client.get(`/rest/${objectNamePlural}`, {
      query: {
        limit: PAGE_SIZE,
        depth: 0,
        filter: query.filter,
        order_by: query.orderBy,
        starting_after: cursor,
      },
    })) as ListResponse;

    records.push(...((response.data[objectNamePlural] ?? []) as TRecord[]));

    if (!response.pageInfo?.hasNextPage) {
      break;
    }

    cursor = response.pageInfo.endCursor;
  }

  return records;
};

export const getRecord = async <TRecord>(
  objectNamePlural: string,
  objectNameSingular: string,
  id: string,
): Promise<TRecord> => {
  const response = (await client.get(`/rest/${objectNamePlural}/${id}`, {
    query: { depth: 0 },
  })) as { data: Record<string, TRecord> };

  return response.data[objectNameSingular];
};

export const updateRecord = (
  objectNamePlural: string,
  id: string,
  data: Record<string, unknown>,
) => client.patch(`/rest/${objectNamePlural}/${id}`, data);

export const callAppRoute = <TResult>(path: string, body: object) =>
  client.post(`/s${path}`, body) as Promise<TResult>;

export const resolveAppRouteUrl = (path: string) =>
  client.resolveUrl(`/s${path}`);
