import { defineLogicFunction } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>GRC Console</title>
</head>
<body>
<div id="root"></div>
<script src="/s${ROUTES.consoleScript}"></script>
</body>
</html>`;

// The page is public because it is only a shell: it holds no data, and the
// console signs in against the workspace before it can read anything.
const handler = async () =>
  new Response(PAGE, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });

export default defineLogicFunction({
  universalIdentifier: uid('function.console-page'),
  name: 'console-page',
  description:
    'Serves the GRC console, the purpose-built interface for the program',
  timeoutSeconds: 10,
  handler,
  httpRouteTriggerSettings: {
    path: ROUTES.console,
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
