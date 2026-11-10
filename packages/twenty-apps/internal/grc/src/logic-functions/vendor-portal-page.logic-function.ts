import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { ROUTES } from '../domain/routes';
import { uid } from '../schema/dsl';
import { findAssessmentByToken, loadResponses } from './shared/assessments';
import {
  renderMessagePage,
  renderQuestionnairePage,
} from './shared/portal-page';
import { findRecord } from './shared/records';

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const CLOSED_STAGES = ['APPROVED', 'REJECTED'];

const handler = async (event: RoutePayload) => {
  const assessment = await findAssessmentByToken(event.pathParameters.token);

  if (!assessment) {
    return html(
      renderMessagePage(
        'Link not found',
        'This questionnaire link is not valid. Ask your contact for a new one.',
      ),
      404,
    );
  }

  if (CLOSED_STAGES.includes(assessment.stage)) {
    return html(
      renderMessagePage(
        'Questionnaire closed',
        'This assessment has been completed and no longer accepts answers.',
      ),
    );
  }

  const vendor = await findRecord<{ name: string }>(
    'vendors',
    `id[eq]:"${assessment.vendorId}"`,
  );

  return html(
    renderQuestionnairePage(
      vendor?.name ?? 'your organization',
      await loadResponses(assessment.id),
    ),
  );
};

export default defineLogicFunction({
  universalIdentifier: uid('function.vendor-portal-page'),
  name: 'vendor-portal-page',
  description:
    'Public page where a vendor answers a questionnaire, addressed by an unguessable token',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: `${ROUTES.vendorPortal}/:token`,
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
