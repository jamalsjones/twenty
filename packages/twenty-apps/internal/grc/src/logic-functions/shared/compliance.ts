import { complianceFromControls } from '../../domain/scoring';
import { listRecords, updateRecord, updateRecords } from './records';

type Control = { id: string; status: string; effectiveness: string };
type Mapping = { controlId: string | null; requirementId: string | null };
type Requirement = {
  id: string;
  frameworkId: string | null;
  assessable: boolean | null;
  complianceStatus: string;
  controlCount: number | null;
};
type Framework = {
  id: string;
  requirementCount: number | null;
  coveredCount: number | null;
  compliantCount: number | null;
};

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

// Recomputes every requirement status from its mapped controls, then the
// per-framework totals. Only rows whose derived values changed are written.
export const recomputeCompliance = async () => {
  const [controls, mappings, requirements, frameworks] = await Promise.all([
    listRecords<Control>('controls'),
    listRecords<Mapping>('controlRequirements'),
    listRecords<Requirement>('requirements', 'assessable[eq]:true'),
    listRecords<Framework>('frameworks'),
  ]);
  const controlById = new Map(controls.map((control) => [control.id, control]));
  const controlsByRequirement = new Map<string, Control[]>();

  for (const mapping of mappings) {
    const control = controlById.get(mapping.controlId ?? '');

    if (!control || !mapping.requirementId) continue;

    controlsByRequirement.set(mapping.requirementId, [
      ...(controlsByRequirement.get(mapping.requirementId) ?? []),
      control,
    ]);
  }

  const pendingUpdates = new Map<string, string[]>();
  const totals = new Map<
    string,
    { total: number; covered: number; compliant: number }
  >();

  for (const requirement of requirements) {
    const mapped = controlsByRequirement.get(requirement.id) ?? [];
    const isOutOfScope = requirement.complianceStatus === 'NOT_APPLICABLE';
    const complianceStatus = isOutOfScope
      ? 'NOT_APPLICABLE'
      : complianceFromControls(mapped);

    if (
      complianceStatus !== requirement.complianceStatus ||
      mapped.length !== (requirement.controlCount ?? 0)
    ) {
      const key = `${complianceStatus}:${mapped.length}`;

      pendingUpdates.set(key, [
        ...(pendingUpdates.get(key) ?? []),
        requirement.id,
      ]);
    }

    if (!requirement.frameworkId || isOutOfScope) continue;

    const total = totals.get(requirement.frameworkId) ?? {
      total: 0,
      covered: 0,
      compliant: 0,
    };

    total.total++;
    if (mapped.length > 0) total.covered++;
    if (complianceStatus === 'COMPLIANT') total.compliant++;
    totals.set(requirement.frameworkId, total);
  }

  for (const [key, ids] of pendingUpdates) {
    const [complianceStatus, controlCount] = key.split(':');

    await updateRecords('requirements', ids, {
      complianceStatus,
      controlCount: Number(controlCount),
    });
  }

  for (const framework of frameworks) {
    const total = totals.get(framework.id) ?? {
      total: 0,
      covered: 0,
      compliant: 0,
    };

    if (
      framework.requirementCount === total.total &&
      framework.coveredCount === total.covered &&
      framework.compliantCount === total.compliant
    ) {
      continue;
    }

    await updateRecord('frameworks', framework.id, {
      requirementCount: total.total,
      coveredCount: total.covered,
      compliantCount: total.compliant,
      coveragePercent: percent(total.covered, total.total),
      compliancePercent: percent(total.compliant, total.total),
    });
  }

  return {
    requirementsUpdated: [...pendingUpdates.values()].flat().length,
    frameworks: frameworks.length,
  };
};
