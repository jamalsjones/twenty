import { useState } from 'react';
import { defineFrontComponent, PageLayoutType } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants';
import { listRecords } from './shared/api';
import { openRecord } from './shared/navigation';
import { TOKENS, type Tone } from './shared/tokens';
import {
  ActionButton,
  Card,
  LoadState,
  Muted,
  Panel,
  Pill,
  ProgressBar,
  RowLink,
  Stat,
} from './shared/ui';
import { useAsync } from './shared/use-async';

type Requirement = {
  id: string;
  refId: string | null;
  name: string;
  section: string | null;
  statement: string | null;
  assessable: boolean | null;
  sortOrder: number | null;
  complianceStatus: string;
  controlCount: number | null;
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  COMPLIANT: { label: 'Compliant', tone: 'green' },
  PARTIALLY_COMPLIANT: { label: 'Partial', tone: 'yellow' },
  NON_COMPLIANT: { label: 'Non-compliant', tone: 'red' },
  NOT_ASSESSED: { label: 'Not assessed', tone: 'gray' },
  NOT_APPLICABLE: { label: 'N/A', tone: 'sky' },
};

const countByStatus = (requirements: Requirement[], status: string) =>
  requirements.filter((requirement) => requirement.complianceStatus === status)
    .length;

const FrameworkCoverage = () => {
  const [frameworkId] = useSelectedRecordIds();
  const [showGapsOnly, setShowGapsOnly] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { data, error, isLoading } = useAsync(
    () =>
      listRecords<Requirement>('requirements', {
        filter: `frameworkId[eq]:"${frameworkId}"`,
      }),
    frameworkId ?? 'none',
  );

  if (!data) {
    return <LoadState isLoading={isLoading} error={error} />;
  }

  const assessable = data
    .filter((requirement) => requirement.assessable)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const inScope = assessable.filter(
    (requirement) => requirement.complianceStatus !== 'NOT_APPLICABLE',
  );
  const compliant = countByStatus(assessable, 'COMPLIANT');
  const partial = countByStatus(assessable, 'PARTIALLY_COMPLIANT');
  const failing = countByStatus(assessable, 'NON_COMPLIANT');
  const unmapped = inScope.filter(
    (requirement) => (requirement.controlCount ?? 0) === 0,
  ).length;
  const sections = [
    ...new Set(
      assessable.map((requirement) => requirement.section ?? 'General'),
    ),
  ];
  const isGap = (requirement: Requirement) =>
    ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NOT_ASSESSED'].includes(
      requirement.complianceStatus,
    );

  return (
    <Panel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Stat
          label="Compliant"
          value={`${inScope.length > 0 ? Math.round((compliant / inScope.length) * 100) : 0}%`}
          tone="green"
          hint={`${compliant} of ${inScope.length} requirements`}
        />
        <Stat label="Partially compliant" value={partial} tone="yellow" />
        <Stat label="Non-compliant" value={failing} tone="red" />
        <Stat
          label="No control mapped"
          value={unmapped}
          tone="orange"
          hint="Coverage gaps"
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Muted>
          {sections.length} sections. Status rolls up from the controls mapped
          to each requirement.
        </Muted>
        <ActionButton
          variant={showGapsOnly ? 'primary' : 'secondary'}
          onClick={() => setShowGapsOnly(!showGapsOnly)}
        >
          {showGapsOnly ? 'Showing gaps only' : 'Show gaps only'}
        </ActionButton>
      </div>

      {sections.map((section) => {
        const sectionRequirements = assessable.filter(
          (requirement) => (requirement.section ?? 'General') === section,
        );
        const visible = showGapsOnly
          ? sectionRequirements.filter(isGap)
          : sectionRequirements;
        const isOpen = openSection === section;

        if (visible.length === 0) return null;

        return (
          <Card key={section} style={{ padding: 0 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpenSection(isOpen ? null : section)}
              style={{
                padding: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontWeight: TOKENS.weight.medium }}>
                  {section}
                </span>
                <Muted>
                  {countByStatus(sectionRequirements, 'COMPLIANT')} of{' '}
                  {sectionRequirements.length} compliant
                </Muted>
              </div>
              <ProgressBar
                total={sectionRequirements.length}
                segments={[
                  {
                    value: countByStatus(sectionRequirements, 'COMPLIANT'),
                    tone: 'green',
                  },
                  {
                    value: countByStatus(
                      sectionRequirements,
                      'PARTIALLY_COMPLIANT',
                    ),
                    tone: 'yellow',
                  },
                  {
                    value: countByStatus(sectionRequirements, 'NON_COMPLIANT'),
                    tone: 'red',
                  },
                ]}
              />
            </div>
            {isOpen ? (
              <div style={{ padding: '0 8px 8px' }}>
                {visible.map((requirement) => (
                  <RowLink
                    key={requirement.id}
                    onClick={() => openRecord('requirement', requirement.id)}
                  >
                    <span
                      style={{
                        width: 96,
                        flexShrink: 0,
                        fontWeight: TOKENS.weight.medium,
                      }}
                    >
                      {requirement.refId}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        color: TOKENS.font.secondary,
                        fontSize: TOKENS.size.sm,
                      }}
                    >
                      {requirement.statement ?? requirement.name}
                    </span>
                    <Muted>
                      {requirement.controlCount === 1
                        ? '1 control'
                        : `${requirement.controlCount ?? 0} controls`}
                    </Muted>
                    <Pill
                      tone={
                        STATUS[requirement.complianceStatus]?.tone ?? 'gray'
                      }
                    >
                      {STATUS[requirement.complianceStatus]?.label ??
                        requirement.complianceStatus}
                    </Pill>
                  </RowLink>
                ))}
              </div>
            ) : null}
          </Card>
        );
      })}
    </Panel>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.frameworkCoverage,
  name: 'grc-framework-coverage',
  description: 'Requirement-by-requirement compliance and control coverage',
  component: FrameworkCoverage,
  widgetAvailability: { pageLayoutType: PageLayoutType.RECORD_PAGE },
});
