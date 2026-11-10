import { useState } from 'react';
import { defineFrontComponent, PageLayoutType } from 'twenty-sdk/define';
import {
  copyToClipboard,
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants';
import { ROUTES } from '../domain/routes';
import { scoreAssessment } from '../domain/scoring';
import {
  callAppRoute,
  getRecord,
  listRecords,
  resolveAppRouteUrl,
  updateRecord,
} from './shared/api';
import { TOKENS, type Tone } from './shared/tokens';
import {
  ActionButton,
  Card,
  LoadState,
  Muted,
  Panel,
  Pill,
  ProgressBar,
  SectionTitle,
  Stat,
} from './shared/ui';
import { useAsync } from './shared/use-async';

type Assessment = {
  id: string;
  name: string;
  stage: string;
  portalToken: string | null;
  submittedAt: string | null;
};
type AssessmentResponse = {
  id: string;
  name: string;
  section: string | null;
  question: string | null;
  answer: string;
  comment: string | null;
  verdict: string;
  weight: number | null;
  sortOrder: number | null;
};

const ANSWER: Record<string, { label: string; tone: Tone }> = {
  YES: { label: 'Yes', tone: 'green' },
  PARTIAL: { label: 'Partially', tone: 'yellow' },
  NO: { label: 'No', tone: 'red' },
  NOT_APPLICABLE: { label: 'N/A', tone: 'sky' },
  UNANSWERED: { label: 'Unanswered', tone: 'gray' },
};

const CLOSED_STAGES = ['APPROVED', 'REJECTED'];

const loadAssessment = async (assessmentId: string) => {
  const [assessment, responses] = await Promise.all([
    getRecord<Assessment>(
      'vendorAssessments',
      'vendorAssessment',
      assessmentId,
    ),
    listRecords<AssessmentResponse>('assessmentResponses', {
      filter: `assessmentId[eq]:"${assessmentId}"`,
    }),
  ]);

  return {
    assessment,
    responses: responses.sort(
      (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
    ),
  };
};

const AssessmentReview = () => {
  const [assessmentId] = useSelectedRecordIds();
  const [isBusy, setIsBusy] = useState(false);
  const { data, error, isLoading, reload } = useAsync(
    () => loadAssessment(assessmentId),
    assessmentId ?? 'none',
  );

  if (!data) {
    return <LoadState isLoading={isLoading} error={error} />;
  }

  const { assessment, responses } = data;
  const { score, answered, total } = scoreAssessment(responses);
  const sections = [
    ...new Set(responses.map((response) => response.section ?? 'General')),
  ];
  const needsFollowUp = responses.filter(
    (response) => response.verdict === 'FOLLOW_UP',
  ).length;
  const isClosed = CLOSED_STAGES.includes(assessment.stage);
  const count = (answer: string) =>
    responses.filter((response) => response.answer === answer).length;

  const run = async (work: () => Promise<unknown>, successMessage: string) => {
    setIsBusy(true);

    try {
      await work();
      await enqueueSnackbar({ message: successMessage, variant: 'success' });
    } catch (workError) {
      await enqueueSnackbar({
        message:
          workError instanceof Error
            ? workError.message
            : 'Something went wrong',
        variant: 'error',
      });
    } finally {
      setIsBusy(false);
      reload();
    }
  };

  const handleCopyPortalLink = () =>
    run(async () => {
      await copyToClipboard(
        resolveAppRouteUrl(`${ROUTES.vendorPortal}/${assessment.portalToken}`),
      );

      if (assessment.stage === 'SCOPING') {
        await updateRecord('vendorAssessments', assessment.id, {
          stage: 'QUESTIONNAIRE_SENT',
          sentAt: new Date().toISOString(),
        });
      }
    }, 'Vendor portal link copied');

  const handleVerdict = (response: AssessmentResponse, verdict: string) =>
    run(
      () => updateRecord('assessmentResponses', response.id, { verdict }),
      'Verdict saved',
    );

  const handleDecision = (decision: 'APPROVED' | 'REMEDIATION' | 'REJECTED') =>
    run(
      () =>
        callAppRoute(ROUTES.completeAssessment, {
          assessmentId: assessment.id,
          decision,
        }),
      decision === 'APPROVED'
        ? 'Vendor approved and risk rating updated'
        : 'Decision recorded and findings raised',
    );

  return (
    <Panel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Stat
          label="Score"
          value={score === null ? '–' : `${score}`}
          tone={
            score === null
              ? undefined
              : score >= 80
                ? 'green'
                : score >= 60
                  ? 'yellow'
                  : 'red'
          }
          hint="Weighted, out of 100"
        />
        <Stat label="Answered" value={`${answered}/${total}`} />
        <Stat
          label="Gaps"
          value={count('NO') + count('PARTIAL')}
          tone="orange"
          hint={`${count('NO')} no, ${count('PARTIAL')} partial`}
        />
        <Stat
          label="Needs follow-up"
          value={needsFollowUp}
          tone={needsFollowUp > 0 ? 'red' : undefined}
        />
      </div>

      <Card
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <ProgressBar
            total={total}
            segments={[
              { value: count('YES'), tone: 'green' },
              { value: count('PARTIAL'), tone: 'yellow' },
              { value: count('NO'), tone: 'red' },
              { value: count('NOT_APPLICABLE'), tone: 'sky' },
            ]}
          />
          <Muted>
            {assessment.submittedAt
              ? `Submitted by the vendor on ${new Date(assessment.submittedAt).toLocaleDateString()}`
              : 'Waiting for the vendor. Share the portal link: no account needed.'}
          </Muted>
        </div>
        <ActionButton
          onClick={handleCopyPortalLink}
          isDisabled={isBusy || !assessment.portalToken}
        >
          Copy vendor portal link
        </ActionButton>
        {isClosed ? null : (
          <>
            <ActionButton
              variant="primary"
              onClick={() => handleDecision('APPROVED')}
              isDisabled={isBusy || answered === 0}
            >
              Approve
            </ActionButton>
            <ActionButton
              onClick={() => handleDecision('REMEDIATION')}
              isDisabled={isBusy || answered === 0}
            >
              Request remediation
            </ActionButton>
            <ActionButton
              onClick={() => handleDecision('REJECTED')}
              isDisabled={isBusy || answered === 0}
            >
              Reject
            </ActionButton>
          </>
        )}
      </Card>

      {sections.map((section) => (
        <div
          key={section}
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <SectionTitle>{section}</SectionTitle>
          {responses
            .filter((response) => (response.section ?? 'General') === section)
            .map((response) => (
              <Card
                key={response.id}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <span
                  style={{
                    width: 64,
                    flexShrink: 0,
                    color: TOKENS.font.tertiary,
                    fontSize: TOKENS.size.sm,
                  }}
                >
                  {response.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <span>{response.question}</span>
                  {response.comment ? (
                    <Muted>“{response.comment}”</Muted>
                  ) : null}
                </div>
                <Pill tone={ANSWER[response.answer]?.tone ?? 'gray'}>
                  {ANSWER[response.answer]?.label ?? response.answer}
                </Pill>
                {isClosed || response.answer === 'UNANSWERED' ? null : (
                  <>
                    <ActionButton
                      variant={
                        response.verdict === 'ACCEPTED'
                          ? 'primary'
                          : 'secondary'
                      }
                      onClick={() => handleVerdict(response, 'ACCEPTED')}
                      isDisabled={isBusy}
                    >
                      Accept
                    </ActionButton>
                    <ActionButton
                      variant={
                        response.verdict === 'FOLLOW_UP'
                          ? 'primary'
                          : 'secondary'
                      }
                      onClick={() => handleVerdict(response, 'FOLLOW_UP')}
                      isDisabled={isBusy}
                    >
                      Follow up
                    </ActionButton>
                  </>
                )}
              </Card>
            ))}
        </div>
      ))}
    </Panel>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.assessmentReview,
  name: 'grc-assessment-review',
  description:
    'Review questionnaire answers, share the vendor portal and decide',
  component: AssessmentReview,
  widgetAvailability: { pageLayoutType: PageLayoutType.RECORD_PAGE },
});
