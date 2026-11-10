import { useState } from 'react';
import { defineFrontComponent, PageLayoutType } from 'twenty-sdk/define';
import {
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants';
import { ROUTES } from '../domain/routes';
import { inherentVendorRisk, TIER_BY_LEVEL } from '../domain/scoring';
import { callAppRoute, getRecord, listRecords } from './shared/api';
import { daysUntil, formatDate, openRecord } from './shared/navigation';
import {
  LEVEL_LABEL,
  LEVEL_TONE,
  solid,
  TOKENS,
  type Tone,
} from './shared/tokens';
import {
  ActionButton,
  Card,
  LoadState,
  Muted,
  Panel,
  Pill,
  RowLink,
  SectionTitle,
  Stat,
} from './shared/ui';
import { useAsync } from './shared/use-async';

type Vendor = {
  id: string;
  name: string;
  status: string;
  tier: string | null;
  criticality: string | null;
  dataClassification: string | null;
  systemAccess: string | null;
  dataTypes: string[] | null;
  certifications: string[] | null;
  inherentRisk: string | null;
  residualRisk: string | null;
  securityScore: number | null;
  lastAssessedAt: string | null;
  nextReviewDate: string | null;
};
type Assessment = {
  id: string;
  name: string;
  stage: string;
  score: number | null;
  dueDate: string | null;
};
type Contract = {
  id: string;
  name: string;
  status: string;
  contractType: string;
  expirationDate: string | null;
  clauses: string[] | null;
};
type Finding = {
  id: string;
  name: string;
  status: string;
  severity: string;
  dueDate: string | null;
};

const EXPECTED_CLAUSES: Record<string, string> = {
  DPA: 'Data processing terms',
  BREACH_NOTIFICATION: 'Breach notification',
  AUDIT_RIGHT: 'Right to audit',
  DATA_RETURN: 'Data return and deletion',
};

const STAGE_TONE: Record<string, Tone> = {
  SCOPING: 'gray',
  QUESTIONNAIRE_SENT: 'sky',
  IN_REVIEW: 'blue',
  REMEDIATION: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
};

const loadProfile = async (vendorId: string) => {
  const filter = { filter: `vendorId[eq]:"${vendorId}"` };
  const [vendor, assessments, contracts, findings] = await Promise.all([
    getRecord<Vendor>('vendors', 'vendor', vendorId),
    listRecords<Assessment>('vendorAssessments', filter),
    listRecords<Contract>('contracts', filter),
    listRecords<Finding>('findings', filter),
  ]);

  return { vendor, assessments, contracts, findings };
};

const ScoreDial = ({ score }: { score: number | null }) => {
  const tone: Tone =
    score === null
      ? 'gray'
      : score >= 80
        ? 'green'
        : score >= 60
          ? 'yellow'
          : 'red';

  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        flexShrink: 0,
        background: `conic-gradient(${solid(tone)} ${(score ?? 0) * 3.6}deg, ${TOKENS.border.medium} 0deg)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: '50%',
          background: TOKENS.background.secondary,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 22, fontWeight: TOKENS.weight.semiBold }}>
          {score ?? '–'}
        </span>
        <span style={{ fontSize: TOKENS.size.xs, color: TOKENS.font.tertiary }}>
          score
        </span>
      </div>
    </div>
  );
};

const VendorProfile = () => {
  const [vendorId] = useSelectedRecordIds();
  const [isLaunching, setIsLaunching] = useState(false);
  const { data, error, isLoading, reload } = useAsync(
    () => loadProfile(vendorId),
    vendorId ?? 'none',
  );

  if (!data) {
    return <LoadState isLoading={isLoading} error={error} />;
  }

  const { vendor, assessments, contracts, findings } = data;
  const computedInherent = inherentVendorRisk(vendor);
  const openFindings = findings.filter(
    (finding) => !['CLOSED', 'RISK_ACCEPTED'].includes(finding.status),
  );
  const activeContracts = contracts.filter((contract) =>
    ['ACTIVE', 'EXPIRING'].includes(contract.status),
  );
  const presentClauses = new Set(
    activeContracts.flatMap((contract) => contract.clauses ?? []),
  );
  const sharesSensitiveData = ['CONFIDENTIAL', 'RESTRICTED'].includes(
    vendor.dataClassification ?? '',
  );
  const missingClauses = sharesSensitiveData
    ? Object.keys(EXPECTED_CLAUSES).filter(
        (clause) => !presentClauses.has(clause),
      )
    : [];

  const handleLaunch = async () => {
    setIsLaunching(true);

    try {
      const result = await callAppRoute<{
        assessmentId: string;
        questionCount: number;
      }>(ROUTES.launchAssessment, { vendorId });

      await enqueueSnackbar({
        message: `Assessment created with ${result.questionCount} questions`,
        variant: 'success',
      });
      await openRecord('vendorAssessment', result.assessmentId);
    } catch (launchError) {
      await enqueueSnackbar({
        message:
          launchError instanceof Error
            ? launchError.message
            : 'Could not start the assessment',
        variant: 'error',
      });
    } finally {
      setIsLaunching(false);
      reload();
    }
  };

  return (
    <Panel>
      <Card
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <ScoreDial score={vendor.securityScore} />
        <div
          style={{
            flex: '1 1 240px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Pill tone={LEVEL_TONE[vendor.inherentRisk ?? computedInherent]}>
              {LEVEL_LABEL[vendor.inherentRisk ?? computedInherent]} inherent
            </Pill>
            {vendor.residualRisk ? (
              <Pill tone={LEVEL_TONE[vendor.residualRisk]}>
                {LEVEL_LABEL[vendor.residualRisk]} residual
              </Pill>
            ) : (
              <Pill tone="gray">Residual not assessed</Pill>
            )}
            {(vendor.certifications ?? []).map((certification) => (
              <Pill key={certification} tone="blue">
                {certification.replace(/_/g, ' ')}
              </Pill>
            ))}
          </div>
          <Muted>
            Tiering model: {vendor.criticality?.toLowerCase() ?? 'unrated'}{' '}
            criticality, {vendor.dataClassification?.toLowerCase() ?? 'no'}{' '}
            data, {vendor.systemAccess?.toLowerCase() ?? 'no'} system access
            gives {LEVEL_LABEL[computedInherent].toLowerCase()} inherent risk (
            {TIER_BY_LEVEL[computedInherent].replace('_', ' ').toLowerCase()}).
          </Muted>
          <Muted>
            Last assessed {formatDate(vendor.lastAssessedAt)} · next review{' '}
            {formatDate(vendor.nextReviewDate)}
          </Muted>
        </div>
        <ActionButton
          variant="primary"
          onClick={handleLaunch}
          isDisabled={isLaunching}
        >
          {isLaunching ? 'Starting…' : 'Start assessment'}
        </ActionButton>
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Stat
          label="Open findings"
          value={openFindings.length}
          tone={openFindings.length > 0 ? 'red' : 'green'}
        />
        <Stat label="Active contracts" value={activeContracts.length} />
        <Stat label="Assessments" value={assessments.length} />
        <Stat
          label="Missing clauses"
          value={missingClauses.length}
          tone={missingClauses.length > 0 ? 'orange' : 'green'}
          hint={sharesSensitiveData ? 'For sensitive data' : 'Not required'}
        />
      </div>

      {missingClauses.length > 0 ? (
        <Card>
          <SectionTitle>Contract gaps</SectionTitle>
          <div
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
          >
            {missingClauses.map((clause) => (
              <Pill key={clause} tone="orange">
                No {EXPECTED_CLAUSES[clause].toLowerCase()}
              </Pill>
            ))}
          </div>
          <Muted>
            This vendor receives {vendor.dataClassification?.toLowerCase()}{' '}
            data, but no active contract carries these protections.
          </Muted>
        </Card>
      ) : null}

      <SectionTitle>Assessments</SectionTitle>
      {assessments.length === 0 ? <Muted>No assessment yet.</Muted> : null}
      {assessments.map((assessment) => (
        <RowLink
          key={assessment.id}
          onClick={() => openRecord('vendorAssessment', assessment.id)}
        >
          <Pill tone={STAGE_TONE[assessment.stage] ?? 'gray'}>
            {assessment.stage.replace(/_/g, ' ').toLowerCase()}
          </Pill>
          <span style={{ flex: 1 }}>{assessment.name}</span>
          <Muted>
            {assessment.score === null ? 'Unscored' : `${assessment.score}/100`}
          </Muted>
        </RowLink>
      ))}

      <SectionTitle>Contracts</SectionTitle>
      {contracts.length === 0 ? <Muted>No contract on file.</Muted> : null}
      {contracts.map((contract) => (
        <RowLink
          key={contract.id}
          onClick={() => openRecord('contract', contract.id)}
        >
          <Pill tone="blue">{contract.contractType.replace(/_/g, ' ')}</Pill>
          <span style={{ flex: 1 }}>{contract.name}</span>
          <Muted>
            {contract.expirationDate
              ? `Expires ${formatDate(contract.expirationDate)}`
              : 'No end date'}
          </Muted>
          {contract.expirationDate &&
          daysUntil(contract.expirationDate) < 90 ? (
            <Pill tone="orange">{daysUntil(contract.expirationDate)}d</Pill>
          ) : null}
        </RowLink>
      ))}

      <SectionTitle>Open findings</SectionTitle>
      {openFindings.length === 0 ? <Muted>Nothing open.</Muted> : null}
      {openFindings.map((finding) => (
        <RowLink
          key={finding.id}
          onClick={() => openRecord('finding', finding.id)}
        >
          <Pill tone={LEVEL_TONE[finding.severity] ?? 'gray'}>
            {LEVEL_LABEL[finding.severity] ?? finding.severity}
          </Pill>
          <span style={{ flex: 1 }}>{finding.name}</span>
          <Muted>Due {formatDate(finding.dueDate)}</Muted>
        </RowLink>
      ))}
    </Panel>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.vendorProfile,
  name: 'grc-vendor-profile',
  description:
    'Risk profile, contract gaps, assessments and findings for a vendor',
  component: VendorProfile,
  widgetAvailability: { pageLayoutType: PageLayoutType.RECORD_PAGE },
});
