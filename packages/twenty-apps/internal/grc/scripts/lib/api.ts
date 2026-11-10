const API_URL = process.env.TWENTY_API_URL ?? 'http://127.0.0.1:3000';
const API_KEY = process.env.TWENTY_API_KEY;

if (!API_KEY) {
  throw new Error(
    'Set TWENTY_API_KEY to a workspace API key (Settings > APIs & Webhooks).',
  );
}

const BATCH_SIZE = 60;
const PAGE_SIZE = 200;
const MAX_ATTEMPTS = 8;
const HTTP_TOO_MANY_REQUESTS = 429;

export type CreatedRecord = { id: string; name: string };

const request = async <TResult>(
  method: string,
  path: string,
  body?: unknown,
  attempt = 1,
): Promise<TResult> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${API_KEY}`,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const isRateLimited =
    response.status === HTTP_TOO_MANY_REQUESTS ||
    text.includes('Too Many Requests');

  if (isRateLimited && attempt < MAX_ATTEMPTS) {
    await wait(attempt * 5000);

    return request(method, path, body, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  return (text ? JSON.parse(text) : {}) as TResult;
};

const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1);

export const createMany = async <TRecord extends CreatedRecord>(
  objectNamePlural: string,
  records: Record<string, unknown>[],
): Promise<TRecord[]> => {
  const created: TRecord[] = [];

  for (let start = 0; start < records.length; start += BATCH_SIZE) {
    const response = await request<{ data: Record<string, TRecord[]> }>(
      'POST',
      `/rest/batch/${objectNamePlural}?depth=0`,
      records.slice(start, start + BATCH_SIZE),
    );

    created.push(...response.data[`create${capitalize(objectNamePlural)}`]);
  }

  return created;
};

export const listAll = async <TRecord>(
  objectNamePlural: string,
  filter?: string,
): Promise<TRecord[]> => {
  const records: TRecord[] = [];
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), depth: '0' });

    if (filter) query.set('filter', filter);
    if (cursor) query.set('starting_after', cursor);

    const response = await request<{
      data: Record<string, TRecord[]>;
      pageInfo?: { hasNextPage?: boolean; endCursor?: string };
    }>('GET', `/rest/${objectNamePlural}?${query}`);

    records.push(...(response.data[objectNamePlural] ?? []));
    cursor = response.pageInfo?.hasNextPage
      ? response.pageInfo.endCursor
      : undefined;
  } while (cursor);

  return records;
};

export const update = (
  objectNamePlural: string,
  id: string,
  data: Record<string, unknown>,
) => request('PATCH', `/rest/${objectNamePlural}/${id}`, data);

export const callRoute = <TResult>(path: string, body: unknown) =>
  request<TResult>('POST', `/s${path}`, body);

export const callPublicRoute = async (path: string, body: unknown) => {
  const response = await fetch(`${API_URL}/s${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed (${response.status})`);
  }
};

export const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
