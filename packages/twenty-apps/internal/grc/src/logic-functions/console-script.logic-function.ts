import { defineLogicFunction } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';

// Public assets are served with a generic content type, which browsers
// refuse to execute, so the bundle is relayed with a JavaScript one.
const handler = async () => {
  const asset = await fetch(getPublicAssetUrl('console/app.js'));

  if (!asset.ok) {
    return new Response('console bundle missing: run yarn build:console', {
      status: 404,
    });
  }

  return new Response(await asset.text(), {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
};

export default defineLogicFunction({
  universalIdentifier: uid('function.console-script'),
  name: 'console-script',
  description: 'Serves the GRC console JavaScript bundle',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: ROUTES.consoleScript,
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
