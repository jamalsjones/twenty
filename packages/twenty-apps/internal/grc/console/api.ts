const TOKEN_KEY = 'grc-console-token';
const PAGE_SIZE = 200;

export class SessionExpiredError extends Error {}

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

const graphql = async <TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> => {
  const response = await fetch('/metadata', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as {
    data?: TData;
    errors?: { message: string }[];
  };

  if (!body.data || body.errors) {
    throw new Error(body.errors?.[0]?.message ?? 'Sign-in failed');
  }

  return body.data;
};

export const signIn = async (email: string, password: string) => {
  const origin = window.location.origin;
  const login = await graphql<{
    getLoginTokenFromCredentials: { loginToken: { token: string } };
  }>(
    `
      mutation ($email: String!, $password: String!, $origin: String!) {
        getLoginTokenFromCredentials(
          email: $email
          password: $password
          origin: $origin
        ) {
          loginToken {
            token
          }
        }
      }
    `,
    { email, password, origin },
  );
  const auth = await graphql<{
    getAuthTokensFromLoginToken: {
      tokens: { accessOrWorkspaceAgnosticToken: { token: string } };
    };
  }>(
    `
      mutation ($loginToken: String!, $origin: String!) {
        getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
          tokens {
            accessOrWorkspaceAgnosticToken {
              token
            }
          }
        }
      }
    `,
    {
      loginToken: login.getLoginTokenFromCredentials.loginToken.token,
      origin,
    },
  );

  sessionStorage.setItem(
    TOKEN_KEY,
    auth.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken
      .token,
  );
};

const request = async <TResult>(
  method: string,
  path: string,
  body?: unknown,
): Promise<TResult> => {
  const response = await fetch(path, {
    method,
    headers: {
      authorization: `Bearer ${getToken()}`,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 || response.status === 403) {
    clearToken();
    throw new SessionExpiredError('Your session expired. Sign in again.');
  }

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(
      parsed.messages?.[0] ?? `Request failed (${response.status})`,
    );
  }

  return parsed as TResult;
};

export type AnyRecord = { id: string; name?: unknown } & Record<
  string,
  unknown
>;

export const listRecords = async (
  objectNamePlural: string,
): Promise<AnyRecord[]> => {
  const records: AnyRecord[] = [];
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), depth: '0' });

    if (cursor) query.set('starting_after', cursor);

    const page = await request<{
      data: Record<string, AnyRecord[]>;
      pageInfo?: { hasNextPage?: boolean; endCursor?: string };
    }>('GET', `/rest/${objectNamePlural}?${query}`);

    records.push(...(page.data[objectNamePlural] ?? []));
    cursor = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : undefined;
  } while (cursor);

  return records;
};

export const updateRecord = (
  objectNamePlural: string,
  id: string,
  data: Record<string, unknown>,
) => request('PATCH', `/rest/${objectNamePlural}/${id}`, data);

export const createRecord = async (
  objectNamePlural: string,
  data: Record<string, unknown>,
): Promise<AnyRecord> => {
  const created = await request<{ data: Record<string, AnyRecord> }>(
    'POST',
    `/rest/${objectNamePlural}`,
    data,
  );

  return Object.values(created.data)[0];
};

export const callRoute = <TResult>(path: string, body: unknown) =>
  request<TResult>('POST', `/s${path}`, body);
