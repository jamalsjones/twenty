import {
  AggregateOperations,
  definePageLayout,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS, PAGE_LAYOUT_IDS } from '../constants';
import { fieldId, objectId, uid } from '../schema/dsl';
import { type ObjectKey } from '../schema/objects';

type Placement = {
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
};
type Widget = NonNullable<
  NonNullable<Parameters<typeof definePageLayout>[0]['tabs']>[number]['widgets']
>[number];

const at = (placement: Placement) => ({
  layoutMode: PageLayoutTabLayoutMode.GRID as const,
  ...placement,
});

const CHART_DEFAULTS = { timezone: 'UTC', firstDayOfTheWeek: 1 } as const;

const counter = (
  key: string,
  title: string,
  object: ObjectKey,
  placement: Placement,
  isAnyOf?: { field: string; values: string[] },
): Widget => ({
  universalIdentifier: uid(`layout.command-center.${key}`),
  title,
  type: 'GRAPH' as const,
  objectUniversalIdentifier: objectId(object),
  position: at(placement),
  configuration: {
    configurationType: 'AGGREGATE_CHART' as const,
    aggregateFieldMetadataUniversalIdentifier: fieldId(object, 'name'),
    aggregateOperation: AggregateOperations.COUNT,
    displayDataLabel: true,
    ...CHART_DEFAULTS,
    ...(isAnyOf
      ? {
          filter: {
            recordFilters: [
              {
                fieldMetadataUniversalIdentifier: fieldId(
                  object,
                  isAnyOf.field,
                ),
                operand: 'IS',
                value: JSON.stringify(isAnyOf.values),
              },
            ],
          },
        }
      : {}),
  },
});

const breakdown = (
  key: string,
  title: string,
  object: ObjectKey,
  groupBy: string,
  shape: 'PIE_CHART' | 'BAR_CHART',
  placement: Placement,
): Widget => ({
  universalIdentifier: uid(`layout.command-center.${key}`),
  title,
  type: 'GRAPH' as const,
  objectUniversalIdentifier: objectId(object),
  position: at(placement),
  configuration:
    shape === 'PIE_CHART'
      ? {
          configurationType: 'PIE_CHART' as const,
          aggregateFieldMetadataUniversalIdentifier: fieldId(object, 'name'),
          aggregateOperation: AggregateOperations.COUNT,
          groupByFieldMetadataUniversalIdentifier: fieldId(object, groupBy),
          displayLegend: true,
          ...CHART_DEFAULTS,
        }
      : {
          configurationType: 'BAR_CHART' as const,
          aggregateFieldMetadataUniversalIdentifier: fieldId(object, 'name'),
          aggregateOperation: AggregateOperations.COUNT,
          primaryAxisGroupByFieldMetadataUniversalIdentifier: fieldId(
            object,
            groupBy,
          ),
          layout: 'VERTICAL' as const,
          primaryAxisOrderBy: 'FIELD_ASC' as const,
          axisNameDisplay: 'NONE' as const,
          color: 'auto' as const,
          ...CHART_DEFAULTS,
        },
});

const component = (
  key: string,
  title: string,
  frontComponentUniversalIdentifier: string,
  placement: Placement,
): Widget => ({
  universalIdentifier: uid(`layout.command-center.${key}`),
  title,
  type: 'FRONT_COMPONENT' as const,
  position: at(placement),
  configuration: {
    configurationType: 'FRONT_COMPONENT' as const,
    frontComponentUniversalIdentifier,
  },
});

export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_IDS.commandCenter,
  name: 'GRC overview',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: uid('layout.command-center.tab.posture'),
      title: 'Posture',
      position: 0,
      icon: 'IconLayoutDashboard',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        counter(
          'kpi-risks',
          'High and critical risks',
          'risk',
          { row: 0, column: 0, rowSpan: 2, columnSpan: 3 },
          { field: 'residualLevel', values: ['HIGH', 'CRITICAL'] },
        ),
        counter(
          'kpi-findings',
          'Open findings',
          'finding',
          { row: 0, column: 3, rowSpan: 2, columnSpan: 3 },
          {
            field: 'status',
            values: ['OPEN', 'IN_REMEDIATION', 'READY_FOR_VALIDATION'],
          },
        ),
        counter(
          'kpi-vendors',
          'Vendors in due diligence',
          'vendor',
          { row: 0, column: 6, rowSpan: 2, columnSpan: 3 },
          { field: 'status', values: ['INTAKE', 'DUE_DILIGENCE'] },
        ),
        counter(
          'kpi-contracts',
          'Contracts expiring or expired',
          'contract',
          { row: 0, column: 9, rowSpan: 2, columnSpan: 3 },
          { field: 'status', values: ['EXPIRING', 'EXPIRED'] },
        ),
        component('heatmap', 'Risk heat map', FRONT_COMPONENT_IDS.riskHeatmap, {
          row: 2,
          column: 0,
          rowSpan: 8,
          columnSpan: 6,
        }),
        component(
          'posture',
          'Framework compliance',
          FRONT_COMPONENT_IDS.compliancePosture,
          { row: 2, column: 6, rowSpan: 8, columnSpan: 6 },
        ),
        component(
          'queue',
          'Needs attention',
          FRONT_COMPONENT_IDS.attentionQueue,
          { row: 10, column: 0, rowSpan: 8, columnSpan: 6 },
        ),
        breakdown(
          'findings-by-severity',
          'Findings by severity',
          'finding',
          'severity',
          'BAR_CHART',
          { row: 10, column: 6, rowSpan: 4, columnSpan: 6 },
        ),
        breakdown(
          'controls-by-effectiveness',
          'Control effectiveness',
          'control',
          'effectiveness',
          'PIE_CHART',
          { row: 14, column: 6, rowSpan: 4, columnSpan: 3 },
        ),
        breakdown(
          'vendors-by-tier',
          'Vendors by tier',
          'vendor',
          'tier',
          'PIE_CHART',
          { row: 14, column: 9, rowSpan: 4, columnSpan: 3 },
        ),
      ],
    },
    {
      universalIdentifier: uid('layout.command-center.tab.third-party'),
      title: 'Third parties',
      position: 1,
      icon: 'IconBuildingStore',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        breakdown(
          'tp-vendors-by-status',
          'Vendor lifecycle',
          'vendor',
          'status',
          'BAR_CHART',
          { row: 0, column: 0, rowSpan: 5, columnSpan: 6 },
        ),
        breakdown(
          'tp-vendors-by-risk',
          'Residual vendor risk',
          'vendor',
          'residualRisk',
          'PIE_CHART',
          { row: 0, column: 6, rowSpan: 5, columnSpan: 6 },
        ),
        breakdown(
          'tp-assessments',
          'Assessment pipeline',
          'vendorAssessment',
          'stage',
          'BAR_CHART',
          { row: 5, column: 0, rowSpan: 5, columnSpan: 6 },
        ),
        breakdown(
          'tp-contracts',
          'Contracts by status',
          'contract',
          'status',
          'BAR_CHART',
          { row: 5, column: 6, rowSpan: 5, columnSpan: 6 },
        ),
      ],
    },
  ],
});
