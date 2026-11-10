import { useState } from 'react';
import { defineFrontComponent, PageLayoutType } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants';
import { levelForScore, ratingOf } from '../domain/scoring';
import { listRecords } from './shared/api';
import { openRecord } from './shared/navigation';
import {
  LEVEL_LABEL,
  LEVEL_TONE,
  tagBackground,
  tagText,
  TOKENS,
} from './shared/tokens';
import {
  ActionButton,
  LoadState,
  Muted,
  Panel,
  Pill,
  RowLink,
} from './shared/ui';
import { useAsync } from './shared/use-async';

type Risk = {
  id: string;
  name: string;
  refId: string | null;
  status: string;
  inherentLikelihood: string | null;
  inherentImpact: string | null;
  residualLikelihood: string | null;
  residualImpact: string | null;
};

type Basis = 'inherent' | 'residual';

const RATINGS = [1, 2, 3, 4, 5];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];
const LIKELIHOOD_LABELS = [
  'Rare',
  'Unlikely',
  'Possible',
  'Likely',
  'Almost certain',
];

const positionOf = (risk: Risk, basis: Basis) => ({
  likelihood: ratingOf(
    basis === 'inherent' ? risk.inherentLikelihood : risk.residualLikelihood,
  ),
  impact: ratingOf(
    basis === 'inherent' ? risk.inherentImpact : risk.residualImpact,
  ),
});

const RiskHeatmap = () => {
  const [basis, setBasis] = useState<Basis>('residual');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const { data, error, isLoading } = useAsync(
    () => listRecords<Risk>('risks'),
    'risks',
  );

  if (!data) {
    return <LoadState isLoading={isLoading} error={error} />;
  }

  const openRisks = data.filter((risk) => risk.status !== 'CLOSED');
  const risksByCell = new Map<string, Risk[]>();

  for (const risk of openRisks) {
    const { likelihood, impact } = positionOf(risk, basis);

    if (likelihood === null || impact === null) continue;

    const cell = `${likelihood}:${impact}`;

    risksByCell.set(cell, [...(risksByCell.get(cell) ?? []), risk]);
  }

  const selectedRisks = selectedCell
    ? (risksByCell.get(selectedCell) ?? [])
    : [];

  return (
    <Panel>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Muted>
          {openRisks.length} open risks plotted by {basis} likelihood and impact
        </Muted>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['inherent', 'residual'] as const).map((option) => (
            <ActionButton
              key={option}
              variant={basis === option ? 'primary' : 'secondary'}
              onClick={() => {
                setBasis(option);
                setSelectedCell(null);
              }}
            >
              {option === 'inherent' ? 'Inherent' : 'Residual'}
            </ActionButton>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '92px repeat(5, minmax(0, 1fr))',
          gap: 4,
        }}
      >
        {[...RATINGS].reverse().map((likelihood) => (
          <div key={likelihood} style={{ display: 'contents' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 6,
                color: TOKENS.font.tertiary,
                fontSize: TOKENS.size.xs,
                textAlign: 'right',
              }}
            >
              {LIKELIHOOD_LABELS[likelihood - 1]}
            </div>
            {RATINGS.map((impact) => {
              const cell = `${likelihood}:${impact}`;
              const tone = LEVEL_TONE[levelForScore(likelihood * impact)];
              const count = risksByCell.get(cell)?.length ?? 0;
              const isSelected = selectedCell === cell;

              return (
                <div
                  key={cell}
                  role="button"
                  tabIndex={0}
                  title={`Likelihood ${likelihood}, impact ${impact}`}
                  onClick={() => setSelectedCell(isSelected ? null : cell)}
                  style={{
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: TOKENS.radius.sm,
                    background: tagBackground(tone),
                    color: tagText(tone),
                    fontWeight: TOKENS.weight.semiBold,
                    fontSize: TOKENS.size.lg,
                    cursor: count > 0 ? 'pointer' : 'default',
                    opacity: count > 0 ? 1 : 0.55,
                    outline: isSelected ? `2px solid ${TOKENS.accent}` : 'none',
                  }}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}
        <div />
        {IMPACT_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              color: TOKENS.font.tertiary,
              fontSize: TOKENS.size.xs,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {selectedCell ? (
        <div>
          {selectedRisks.map((risk) => {
            const { likelihood, impact } = positionOf(risk, basis);
            const level = levelForScore((likelihood ?? 0) * (impact ?? 0));

            return (
              <RowLink
                key={risk.id}
                onClick={() => openRecord('risk', risk.id)}
              >
                <Pill tone={LEVEL_TONE[level]}>{LEVEL_LABEL[level]}</Pill>
                <span style={{ flex: 1 }}>{risk.name}</span>
                <Muted>{risk.refId}</Muted>
              </RowLink>
            );
          })}
        </div>
      ) : (
        <Muted>Select a cell to list its risks.</Muted>
      )}
    </Panel>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.riskHeatmap,
  name: 'grc-risk-heatmap',
  description: '5x5 likelihood and impact matrix of open risks',
  component: RiskHeatmap,
  widgetAvailability: { pageLayoutType: PageLayoutType.DASHBOARD },
});
