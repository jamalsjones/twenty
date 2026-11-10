import { defineFrontComponent, PageLayoutType } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants';
import { listRecords } from './shared/api';
import { openRecord } from './shared/navigation';
import { TOKENS } from './shared/tokens';
import { LoadState, Muted, Panel, Pill, ProgressBar } from './shared/ui';
import { useAsync } from './shared/use-async';

type Framework = {
  id: string;
  name: string;
  provider: string | null;
  kind: string;
  scope: string;
  requirementCount: number | null;
  coveredCount: number | null;
  compliantCount: number | null;
  coveragePercent: number | null;
  compliancePercent: number | null;
};

const CompliancePosture = () => {
  const { data, error, isLoading } = useAsync(
    () => listRecords<Framework>('frameworks'),
    'frameworks',
  );

  if (!data) {
    return <LoadState isLoading={isLoading} error={error} />;
  }

  const frameworks = data
    .filter((framework) => framework.kind !== 'QUESTIONNAIRE')
    .filter((framework) => framework.scope !== 'REFERENCE')
    .sort(
      (left, right) =>
        (right.compliancePercent ?? 0) - (left.compliancePercent ?? 0),
    );

  return (
    <Panel>
      {frameworks.length === 0 ? (
        <Muted>
          No framework is in scope yet. Import one to start tracking coverage.
        </Muted>
      ) : null}
      {frameworks.map((framework) => {
        const total = framework.requirementCount ?? 0;
        const compliant = framework.compliantCount ?? 0;
        const covered = Math.max(framework.coveredCount ?? 0, compliant);

        return (
          <div
            key={framework.id}
            role="button"
            tabIndex={0}
            onClick={() => openRecord('framework', framework.id)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: TOKENS.weight.medium, flex: 1 }}>
                {framework.name}
              </span>
              <Muted>
                {compliant} of {total} compliant
              </Muted>
              <Pill
                tone={
                  (framework.compliancePercent ?? 0) >= 80
                    ? 'green'
                    : (framework.compliancePercent ?? 0) >= 50
                      ? 'yellow'
                      : 'orange'
                }
              >
                {framework.compliancePercent ?? 0}%
              </Pill>
            </div>
            <ProgressBar
              total={total}
              segments={[
                { value: compliant, tone: 'green' },
                { value: covered - compliant, tone: 'yellow' },
              ]}
            />
            <Muted>
              {framework.coveragePercent ?? 0}% of requirements have a control
              mapped
              {framework.provider ? ` · ${framework.provider}` : ''}
            </Muted>
          </div>
        );
      })}
    </Panel>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.compliancePosture,
  name: 'grc-compliance-posture',
  description: 'Control coverage and compliance for every in-scope framework',
  component: CompliancePosture,
  widgetAvailability: { pageLayoutType: PageLayoutType.DASHBOARD },
});
