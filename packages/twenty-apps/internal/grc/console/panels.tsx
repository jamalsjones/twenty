import { useState } from 'react';

import { ROUTES } from '../src/domain/routes';
import {
  inherentVendorRisk,
  levelForScore,
  ratingOf,
  scoreAssessment,
  TIER_BY_LEVEL,
} from '../src/domain/scoring';
import { type AnyRecord, callRoute, updateRecord } from './api';
import {
  Badge,
  daysUntil,
  displayName,
  formatDate,
  OptionBadge,
} from './fields';
import { openRecord } from './generic';
import { useStore } from './store';

type Notify = (message: string, isError?: boolean) => void;

const LEVEL_LABEL: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};
const LEVEL_TONE: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};
const RATINGS = [1, 2, 3, 4, 5];
const LIKELIHOOD = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
const IMPACT = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];
const OPEN_FINDING = ['OPEN', 'IN_REMEDIATION', 'READY_FOR_VALIDATION'];

type Segment = { value: number; tone: 'green' | 'yellow' | 'red' | 'sky' };

export const Bar = ({
  segments,
  total,
}: {
  segments: Segment[];
  total: number;
}) => (
  <div className="bar">
    {segments.map((segment, index) => (
      <span
        key={index}
        className={`seg-${segment.tone}`}
        style={{ width: `${total > 0 ? (segment.value / total) * 100 : 0}%` }}
      />
    ))}
  </div>
);

export const HeatMap = () => {
  const store = useStore();
  const [basis, setBasis] = useState<'inherent' | 'residual'>('residual');
  const [selected, setSelected] = useState<string | null>(null);
  const risks = store
    .records('risk')
    .filter((risk) => risk.status !== 'CLOSED');
  const cellOf = (risk: AnyRecord) => {
    const likelihood = ratingOf(risk[`${basis}Likelihood`] as string);
    const impact = ratingOf(risk[`${basis}Impact`] as string);

    return likelihood && impact ? `${likelihood}:${impact}` : null;
  };
  const inCell = (cell: string) =>
    risks.filter((risk) => cellOf(risk) === cell);

  return (
    <div className="card">
      <div className="card-head">
        <h3>Risk heat map</h3>
        <div className="row">
          {(['inherent', 'residual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`btn ${basis === option ? 'primary' : ''}`}
              onClick={() => {
                setBasis(option);
                setSelected(null);
              }}
            >
              {option === 'inherent' ? 'Inherent' : 'Residual'}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body">
        <div className="heat">
          {[...RATINGS].reverse().map((likelihood) => (
            <div key={likelihood} style={{ display: 'contents' }}>
              <div className="heat-axis">{LIKELIHOOD[likelihood - 1]}</div>
              {RATINGS.map((impact) => {
                const cell = `${likelihood}:${impact}`;
                const count = inCell(cell).length;

                return (
                  <button
                    key={cell}
                    type="button"
                    aria-label={`${LIKELIHOOD[likelihood - 1]} likelihood, ${IMPACT[impact - 1]} impact: ${count} risks`}
                    className={`heat-cell lvl-${levelForScore(likelihood * impact)} ${count === 0 ? 'empty-cell' : ''} ${selected === cell ? 'selected' : ''}`}
                    onClick={() =>
                      setSelected(
                        selected === cell || count === 0 ? null : cell,
                      )
                    }
                  >
                    {count > 0 ? count : ''}
                  </button>
                );
              })}
            </div>
          ))}
          <div />
          {IMPACT.map((label) => (
            <div key={label} className="heat-axis x">
              {label}
            </div>
          ))}
        </div>
      </div>
      {selected
        ? inCell(selected).map((risk) => (
            <div
              key={risk.id}
              className="list-row"
              onClick={() => openRecord('risk', risk.id)}
            >
              <span className="ref">{String(risk.refId ?? '')}</span>
              <span className="grow">{displayName(risk)}</span>
              <OptionBadge
                objectKey="risk"
                fieldName="treatment"
                value={risk.treatment}
              />
            </div>
          ))
        : null}
    </div>
  );
};

const Kpi = ({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  tone: string;
  hint: string;
}) => (
  <div className={`card kpi ${tone}`}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-hint">{hint}</div>
  </div>
);

type Deadline = {
  key: string;
  objectKey: string;
  id: string;
  label: string;
  tone: string;
  title: string;
  date: string;
};

const HORIZON_DAYS = 60;

export const Overview = () => {
  const store = useStore();
  const risks = store
    .records('risk')
    .filter((risk) => risk.status !== 'CLOSED');
  const findings = store
    .records('finding')
    .filter((finding) => OPEN_FINDING.includes(finding.status as string));
  const vendors = store.records('vendor');
  const contracts = store.records('contract');
  const controls = store.records('control');
  const frameworks = store
    .records('framework')
    .filter((framework) => framework.kind !== 'QUESTIONNAIRE');
  const overdueFindings = findings.filter(
    (finding) =>
      typeof finding.dueDate === 'string' && daysUntil(finding.dueDate) < 0,
  );
  const failing = controls.filter(
    (control) => control.effectiveness === 'INEFFECTIVE',
  );

  const collect = (
    objectKey: string,
    label: string,
    tone: string,
    dateField: string,
    isRelevant: (record: AnyRecord) => boolean,
  ): Deadline[] =>
    store.records(objectKey).flatMap((record) => {
      const date = record[dateField];

      return typeof date === 'string' &&
        isRelevant(record) &&
        daysUntil(date) <= HORIZON_DAYS
        ? [
            {
              key: `${objectKey}${record.id}`,
              objectKey,
              id: record.id,
              label,
              tone,
              title: displayName(record),
              date,
            },
          ]
        : [];
    });
  const deadlines = [
    ...collect(
      'contract',
      'Renewal notice',
      'orange',
      'renewalNoticeDate',
      (record) => ['ACTIVE', 'EXPIRING'].includes(record.status as string),
    ),
    ...collect('finding', 'Finding due', 'red', 'dueDate', (record) =>
      OPEN_FINDING.includes(record.status as string),
    ),
    ...collect(
      'policy',
      'Policy review',
      'blue',
      'nextReviewDate',
      (record) => record.status === 'PUBLISHED',
    ),
    ...collect(
      'vendor',
      'Vendor review',
      'purple',
      'nextReviewDate',
      (record) => ['APPROVED', 'CONDITIONAL'].includes(record.status as string),
    ),
    ...collect(
      'evidence',
      'Evidence expiry',
      'yellow',
      'validUntil',
      (record) => record.status !== 'REQUESTED',
    ),
    ...collect(
      'control',
      'Control test',
      'turquoise',
      'nextTestDue',
      (record) => record.status === 'OPERATIONAL',
    ),
  ].sort((left, right) => left.date.localeCompare(right.date));
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const maxSeverity = Math.max(
    1,
    ...severities.map(
      (severity) =>
        findings.filter((finding) => finding.severity === severity).length,
    ),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Program overview</h1>
          <div className="sub">
            Posture across risk, compliance, third parties and open issues.
          </div>
        </div>
      </div>
      <div className="grid cols-4">
        <Kpi
          label="High and critical risks"
          value={
            risks.filter((risk) =>
              ['HIGH', 'CRITICAL'].includes(risk.residualLevel as string),
            ).length
          }
          tone="red"
          hint={`${risks.length} open risks, residual rating`}
        />
        <Kpi
          label="Open findings"
          value={findings.length}
          tone="orange"
          hint={`${overdueFindings.length} past due`}
        />
        <Kpi
          label="Failing controls"
          value={failing.length}
          tone="red"
          hint={`of ${controls.length} in the library`}
        />
        <Kpi
          label="Vendors in due diligence"
          value={
            vendors.filter((vendor) =>
              ['INTAKE', 'DUE_DILIGENCE'].includes(vendor.status as string),
            ).length
          }
          tone="blue"
          hint={`${vendors.length} vendors on the register`}
        />
        <Kpi
          label="Contracts expiring or lapsed"
          value={
            contracts.filter((contract) =>
              ['EXPIRING', 'EXPIRED'].includes(contract.status as string),
            ).length
          }
          tone="orange"
          hint={`${contracts.filter((contract) => contract.status === 'EXPIRED').length} already lapsed`}
        />
      </div>
      <div className="grid cols-2">
        <HeatMap />
        <div className="card">
          <div className="card-head">
            <h3>Framework compliance</h3>
          </div>
          <div
            className="card-body"
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {frameworks.map((framework) => {
              const total = Number(framework.requirementCount ?? 0);
              const compliant = Number(framework.compliantCount ?? 0);
              const covered = Math.max(
                Number(framework.coveredCount ?? 0),
                compliant,
              );

              return (
                <div
                  key={framework.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openRecord('framework', framework.id)}
                >
                  <div
                    className="row"
                    style={{ justifyContent: 'space-between', marginBottom: 6 }}
                  >
                    <b>{displayName(framework)}</b>
                    <span className="muted">
                      {compliant} of {total} compliant ·{' '}
                      {String(framework.compliancePercent ?? 0)}%
                    </span>
                  </div>
                  <Bar
                    total={total}
                    segments={[
                      { value: compliant, tone: 'green' },
                      { value: covered - compliant, tone: 'yellow' },
                    ]}
                  />
                  <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                    {String(framework.coveragePercent ?? 0)}% of requirements
                    have a control mapped
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Needs attention</h3>
            <span className="muted">
              {deadlines.length} in the next {HORIZON_DAYS} days
            </span>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {deadlines.map((deadline) => {
              const days = daysUntil(deadline.date);

              return (
                <div
                  key={deadline.key}
                  className="list-row"
                  onClick={() => openRecord(deadline.objectKey, deadline.id)}
                >
                  <Badge tone={deadline.tone}>{deadline.label}</Badge>
                  <span className="grow">{deadline.title}</span>
                  <span className="muted">{formatDate(deadline.date)}</span>
                  <Badge tone={days < 0 ? 'red' : 'gray'}>
                    {days < 0
                      ? `${-days}d overdue`
                      : days === 0
                        ? 'today'
                        : `in ${days}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Open findings by severity</h3>
          </div>
          <div
            className="card-body"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {severities.map((severity) => {
              const count = findings.filter(
                (finding) => finding.severity === severity,
              ).length;

              return (
                <div
                  key={severity}
                  className="row"
                  style={{ flexWrap: 'nowrap' }}
                >
                  <span style={{ width: 70 }}>{LEVEL_LABEL[severity]}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      className={`lvl-${severity}`}
                      style={{
                        height: 20,
                        borderRadius: 4,
                        width: `${(count / maxSeverity) * 100}%`,
                        minWidth: count > 0 ? 6 : 0,
                      }}
                    />
                  </div>
                  <b style={{ width: 28, textAlign: 'right' }}>{count}</b>
                </div>
              );
            })}
            <div
              className="card-head"
              style={{ padding: '12px 0 0', border: 0 }}
            >
              <h3>Vendors by tier</h3>
            </div>
            <div className="row">
              {(['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'] as const).map(
                (tier) => (
                  <span key={tier} className="row" style={{ gap: 6 }}>
                    <OptionBadge
                      objectKey="vendor"
                      fieldName="tier"
                      value={tier}
                    />
                    <b>
                      {vendors.filter((vendor) => vendor.tier === tier).length}
                    </b>
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const EXPECTED_CLAUSES: Record<string, string> = {
  DPA: 'data processing terms',
  BREACH_NOTIFICATION: 'breach notification',
  AUDIT_RIGHT: 'right to audit',
  DATA_RETURN: 'data return and deletion',
};

export const VendorPanel = ({
  vendor,
  notify,
}: {
  vendor: AnyRecord;
  notify: Notify;
}) => {
  const store = useStore();
  const [isLaunching, setIsLaunching] = useState(false);
  const score = vendor.securityScore as number | null;
  const tone =
    score === null || score === undefined
      ? '#c5ced4'
      : score >= 80
        ? '#2f9e66'
        : score >= 60
          ? '#e0b100'
          : '#d64533';
  const computed = inherentVendorRisk(
    vendor as Parameters<typeof inherentVendorRisk>[0],
  );
  const active = store
    .records('contract')
    .filter(
      (contract) =>
        contract.vendorId === vendor.id &&
        ['ACTIVE', 'EXPIRING'].includes(contract.status as string),
    );
  const clauses = new Set(
    active.flatMap((contract) => (contract.clauses as string[] | null) ?? []),
  );
  const isSensitive = ['CONFIDENTIAL', 'RESTRICTED'].includes(
    vendor.dataClassification as string,
  );
  const missing = isSensitive
    ? Object.keys(EXPECTED_CLAUSES).filter((clause) => !clauses.has(clause))
    : [];

  const handleLaunch = async () => {
    setIsLaunching(true);

    try {
      const result = await callRoute<{
        assessmentId: string;
        questionCount: number;
      }>(ROUTES.launchAssessment, { vendorId: vendor.id });

      await store.reload();
      notify(`Assessment created with ${result.questionCount} questions`);
      openRecord('vendorAssessment', result.assessmentId);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Could not start the assessment',
        true,
      );
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body row" style={{ gap: 20, alignItems: 'center' }}>
        <div
          className="dial"
          style={{
            background: `conic-gradient(${tone} ${(score ?? 0) * 3.6}deg, #e3e8eb 0deg)`,
          }}
        >
          <div className="dial-inner">
            <span>
              <b>{score ?? '–'}</b>
              <br />
              <span className="muted" style={{ fontSize: 11 }}>
                security score
              </span>
            </span>
          </div>
        </div>
        <div
          style={{
            flex: '1 1 320px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div className="row">
            <OptionBadge
              objectKey="vendor"
              fieldName="tier"
              value={vendor.tier}
            />
            <Badge
              tone={LEVEL_TONE[(vendor.inherentRisk as string) ?? computed]}
            >
              {LEVEL_LABEL[(vendor.inherentRisk as string) ?? computed]}{' '}
              inherent risk
            </Badge>
            {vendor.residualRisk ? (
              <Badge tone={LEVEL_TONE[vendor.residualRisk as string]}>
                {LEVEL_LABEL[vendor.residualRisk as string]} residual risk
              </Badge>
            ) : (
              <Badge tone="gray">Residual risk not assessed</Badge>
            )}
          </div>
          <div className="muted">
            Tiering: {String(vendor.criticality ?? 'unrated').toLowerCase()}{' '}
            criticality,{' '}
            {String(vendor.dataClassification ?? 'no').toLowerCase()} data and{' '}
            {String(vendor.systemAccess ?? 'no').toLowerCase()} system access
            give {LEVEL_LABEL[computed].toLowerCase()} inherent risk (
            {TIER_BY_LEVEL[computed].replace('_', ' ').toLowerCase()}).
          </div>
          {missing.length > 0 ? (
            <div className="row">
              <b>Contract gaps:</b>
              {missing.map((clause) => (
                <Badge key={clause} tone="orange">
                  No {EXPECTED_CLAUSES[clause]}
                </Badge>
              ))}
            </div>
          ) : isSensitive ? (
            <div className="row">
              <Badge tone="green">
                Contract protections in place for the data shared
              </Badge>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={isLaunching}
          onClick={handleLaunch}
        >
          {isLaunching ? 'Starting…' : 'Start assessment'}
        </button>
      </div>
    </div>
  );
};

const ANSWER: Record<string, [string, string]> = {
  YES: ['Yes', 'green'],
  PARTIAL: ['Partially', 'yellow'],
  NO: ['No', 'red'],
  NOT_APPLICABLE: ['N/A', 'sky'],
  UNANSWERED: ['Unanswered', 'gray'],
};

export const AssessmentPanel = ({
  assessment,
  notify,
}: {
  assessment: AnyRecord;
  notify: Notify;
}) => {
  const store = useStore();
  const [isBusy, setIsBusy] = useState(false);
  const responses = store
    .records('assessmentResponse')
    .filter((response) => response.assessmentId === assessment.id)
    .sort(
      (left, right) =>
        Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0),
    );
  const { score, answered, total } = scoreAssessment(
    responses as unknown as { answer: string; weight?: number | null }[],
  );
  const count = (answer: string) =>
    responses.filter((response) => response.answer === answer).length;
  const sections = [
    ...new Set(
      responses.map((response) => String(response.section ?? 'General')),
    ),
  ];
  const isClosed = ['APPROVED', 'REJECTED'].includes(
    assessment.stage as string,
  );
  const portalUrl = `${window.location.origin}/s${ROUTES.vendorPortal}/${String(assessment.portalToken)}`;

  const run = async (work: () => Promise<unknown>, message: string) => {
    setIsBusy(true);

    try {
      await work();
      await store.reload();
      notify(message);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Something went wrong',
        true,
      );
    } finally {
      setIsBusy(false);
    }
  };
  const decide = (decision: string, message: string) =>
    run(
      () =>
        callRoute(ROUTES.completeAssessment, {
          assessmentId: assessment.id,
          decision,
        }),
      message,
    );
  const copyLink = () =>
    run(async () => {
      await navigator.clipboard.writeText(portalUrl).catch(() => undefined);

      if (assessment.stage === 'SCOPING') {
        await updateRecord('vendorAssessments', assessment.id, {
          stage: 'QUESTIONNAIRE_SENT',
          sentAt: new Date().toISOString(),
        });
      }
    }, 'Vendor portal link copied');

  return (
    <>
      <div className="grid cols-4">
        <Kpi
          label="Score"
          value={score ?? '–'}
          tone={
            score === null
              ? 'blue'
              : score >= 80
                ? 'green'
                : score >= 60
                  ? 'orange'
                  : 'red'
          }
          hint="Weighted, out of 100"
        />
        <Kpi
          label="Answered"
          value={`${answered}/${total}`}
          tone="blue"
          hint={
            assessment.submittedAt
              ? `Submitted ${formatDate(assessment.submittedAt)}`
              : 'Waiting for the vendor'
          }
        />
        <Kpi
          label="Gaps"
          value={count('NO') + count('PARTIAL')}
          tone="orange"
          hint={`${count('NO')} no, ${count('PARTIAL')} partial`}
        />
        <Kpi
          label="Needs follow-up"
          value={
            responses.filter((response) => response.verdict === 'FOLLOW_UP')
              .length
          }
          tone="red"
          hint="Flagged by the reviewer"
        />
      </div>
      <div className="card">
        <div
          className="card-body"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Bar
            total={total}
            segments={[
              { value: count('YES'), tone: 'green' },
              { value: count('PARTIAL'), tone: 'yellow' },
              { value: count('NO'), tone: 'red' },
              { value: count('NOT_APPLICABLE'), tone: 'sky' },
            ]}
          />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row">
              <a href={portalUrl} target="_blank" rel="noreferrer">
                Open vendor portal
              </a>
              <button
                type="button"
                className="btn"
                disabled={isBusy}
                onClick={copyLink}
              >
                Copy portal link
              </button>
            </div>
            {isClosed ? (
              <span className="muted">
                Decision recorded {formatDate(assessment.completedAt)}
              </span>
            ) : (
              <div className="row">
                <button
                  type="button"
                  className="btn primary"
                  disabled={isBusy || answered === 0}
                  onClick={() =>
                    decide(
                      'APPROVED',
                      'Vendor approved and risk rating updated',
                    )
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={isBusy || answered === 0}
                  onClick={() =>
                    decide(
                      'REMEDIATION',
                      'Remediation requested and findings raised',
                    )
                  }
                >
                  Request remediation
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={isBusy || answered === 0}
                  onClick={() =>
                    decide('REJECTED', 'Vendor rejected and findings raised')
                  }
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {sections.map((section) => (
        <div className="card" key={section}>
          <div className="card-head">
            <h3>{section}</h3>
          </div>
          {responses
            .filter(
              (response) => String(response.section ?? 'General') === section,
            )
            .map((response) => (
              <div className="question" key={response.id}>
                <span className="ref" style={{ width: 64, flexShrink: 0 }}>
                  {String(response.name)}
                </span>
                <div style={{ flex: 1 }}>
                  <div>{String(response.question ?? '')}</div>
                  {response.comment ? (
                    <div className="muted">“{String(response.comment)}”</div>
                  ) : null}
                </div>
                <Badge tone={ANSWER[response.answer as string]?.[1] ?? 'gray'}>
                  {ANSWER[response.answer as string]?.[0] ??
                    String(response.answer)}
                </Badge>
                {isClosed || response.answer === 'UNANSWERED' ? null : (
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <button
                      type="button"
                      className={`btn ${response.verdict === 'ACCEPTED' ? 'primary' : ''}`}
                      disabled={isBusy}
                      onClick={() =>
                        run(
                          () =>
                            updateRecord('assessmentResponses', response.id, {
                              verdict: 'ACCEPTED',
                            }),
                          'Answer accepted',
                        )
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={`btn ${response.verdict === 'FOLLOW_UP' ? 'primary' : ''}`}
                      disabled={isBusy}
                      onClick={() =>
                        run(
                          () =>
                            updateRecord('assessmentResponses', response.id, {
                              verdict: 'FOLLOW_UP',
                            }),
                          'Flagged for follow-up',
                        )
                      }
                    >
                      Follow up
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      ))}
    </>
  );
};

const STATUS_TONE: Record<string, 'green' | 'yellow' | 'red'> = {
  COMPLIANT: 'green',
  PARTIALLY_COMPLIANT: 'yellow',
  NON_COMPLIANT: 'red',
};

export const FrameworkPanel = ({ framework }: { framework: AnyRecord }) => {
  const store = useStore();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [gapsOnly, setGapsOnly] = useState(false);
  const requirements = store
    .records('requirement')
    .filter(
      (requirement) =>
        requirement.frameworkId === framework.id && requirement.assessable,
    )
    .sort(
      (left, right) =>
        Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0),
    );
  const count = (list: AnyRecord[], status: string) =>
    list.filter((requirement) => requirement.complianceStatus === status)
      .length;
  const sections = [
    ...new Set(
      requirements.map((requirement) =>
        String(requirement.section ?? 'General'),
      ),
    ),
  ];
  const isGap = (requirement: AnyRecord) =>
    requirement.complianceStatus !== 'COMPLIANT' &&
    requirement.complianceStatus !== 'NOT_APPLICABLE';

  return (
    <>
      <div className="grid cols-4">
        <Kpi
          label="Compliant"
          value={`${String(framework.compliancePercent ?? 0)}%`}
          tone="green"
          hint={`${count(requirements, 'COMPLIANT')} of ${requirements.length} requirements`}
        />
        <Kpi
          label="Partially compliant"
          value={count(requirements, 'PARTIALLY_COMPLIANT')}
          tone="orange"
          hint="Control exists, not fully effective"
        />
        <Kpi
          label="Non-compliant"
          value={count(requirements, 'NON_COMPLIANT')}
          tone="red"
          hint="Mapped controls are failing"
        />
        <Kpi
          label="No control mapped"
          value={
            requirements.filter((requirement) => !requirement.controlCount)
              .length
          }
          tone="blue"
          hint="Coverage gaps"
        />
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">
          Status rolls up automatically from the controls mapped to each
          requirement.
        </span>
        <button
          type="button"
          className={`btn ${gapsOnly ? 'primary' : ''}`}
          onClick={() => setGapsOnly(!gapsOnly)}
        >
          {gapsOnly ? 'Showing gaps only' : 'Show gaps only'}
        </button>
      </div>
      {sections.map((section) => {
        const inSection = requirements.filter(
          (requirement) => String(requirement.section ?? 'General') === section,
        );
        const visible = gapsOnly ? inSection.filter(isGap) : inSection;

        if (visible.length === 0) return null;

        return (
          <div className="card" key={section}>
            <div
              className="card-body"
              style={{ cursor: 'pointer' }}
              onClick={() =>
                setOpenSection(openSection === section ? null : section)
              }
            >
              <div
                className="row"
                style={{ justifyContent: 'space-between', marginBottom: 8 }}
              >
                <b>{section}</b>
                <span className="muted">
                  {count(inSection, 'COMPLIANT')} of {inSection.length}{' '}
                  compliant
                </span>
              </div>
              <Bar
                total={inSection.length}
                segments={(
                  ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT'] as const
                ).map((status) => ({
                  value: count(inSection, status),
                  tone: STATUS_TONE[status],
                }))}
              />
            </div>
            {openSection === section
              ? visible.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="list-row"
                    onClick={() => openRecord('requirement', requirement.id)}
                  >
                    <span className="ref" style={{ width: 92, flexShrink: 0 }}>
                      {String(requirement.refId ?? '')}
                    </span>
                    <span style={{ flex: 1 }}>
                      {String(
                        requirement.statement ?? displayName(requirement),
                      )}
                    </span>
                    <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {requirement.controlCount === 1
                        ? '1 control'
                        : `${String(requirement.controlCount ?? 0)} controls`}
                    </span>
                    <OptionBadge
                      objectKey="requirement"
                      fieldName="complianceStatus"
                      value={requirement.complianceStatus}
                    />
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </>
  );
};
