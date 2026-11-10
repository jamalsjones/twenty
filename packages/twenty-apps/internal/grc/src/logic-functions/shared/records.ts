import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

type ListResponse = {
  data: Record<string, unknown[]>;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string };
};

const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const UPDATE_CHUNK_SIZE = 100;
const MAX_ATTEMPTS = 6;
const HTTP_TOO_MANY_REQUESTS = 429;

// Automation acts with the app's own role, so a roll-up triggered by a
// read-only user still writes its derived fields.
const client = new RestApiClient({ runAs: 'application' });

// App API calls share a per-minute budget; a roll-up that hits it waits and
// retries instead of failing half-applied.
const withRetry = async <TResult>(call: () => Promise<TResult>) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const isRateLimited =
        error instanceof RestApiClientError &&
        error.status === HTTP_TOO_MANY_REQUESTS;

      if (!isRateLimited || attempt === MAX_ATTEMPTS) throw error;

      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
};

export const listRecords = async <TRecord>(
  objectNamePlural: string,
  filter?: string,
): Promise<TRecord[]> => {
  const records: TRecord[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = (await withRetry(() =>
      client.get(`/rest/${objectNamePlural}`, {
        query: { limit: PAGE_SIZE, depth: 0, filter, starting_after: cursor },
      }),
    )) as ListResponse;

    records.push(...((response.data[objectNamePlural] ?? []) as TRecord[]));

    if (!response.pageInfo?.hasNextPage) break;

    cursor = response.pageInfo.endCursor;
  }

  return records;
};

export const findRecord = async <TRecord>(
  objectNamePlural: string,
  filter: string,
): Promise<TRecord | undefined> => {
  const response = (await withRetry(() =>
    client.get(`/rest/${objectNamePlural}`, {
      query: { limit: 1, depth: 0, filter },
    }),
  )) as ListResponse;

  return response.data[objectNamePlural]?.[0] as TRecord | undefined;
};

export const createRecord = async <TRecord>(
  objectNamePlural: string,
  data: Record<string, unknown>,
): Promise<TRecord> => {
  const response = (await withRetry(() =>
    client.post(`/rest/${objectNamePlural}`, data),
  )) as { data: Record<string, TRecord> };

  return Object.values(response.data)[0];
};

export const createRecords = async (
  objectNamePlural: string,
  data: Record<string, unknown>[],
) => {
  for (let start = 0; start < data.length; start += PAGE_SIZE) {
    await withRetry(() =>
      client.post(
        `/rest/batch/${objectNamePlural}`,
        data.slice(start, start + PAGE_SIZE),
      ),
    );
  }
};

export const updateRecord = (
  objectNamePlural: string,
  id: string,
  data: Record<string, unknown>,
) => withRetry(() => client.patch(`/rest/${objectNamePlural}/${id}`, data));

// One request per chunk of ids that receive the same values.
export const updateRecords = async (
  objectNamePlural: string,
  ids: string[],
  data: Record<string, unknown>,
) => {
  for (let start = 0; start < ids.length; start += UPDATE_CHUNK_SIZE) {
    const chunk = ids.slice(start, start + UPDATE_CHUNK_SIZE);

    await withRetry(() =>
      client.patch(`/rest/${objectNamePlural}`, data, {
        query: { filter: `id[in]:[${chunk.map((id) => `"${id}"`).join(',')}]` },
      }),
    );
  }
};

export const today = () => new Date().toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number) => {
  const date = new Date(isoDate);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};
