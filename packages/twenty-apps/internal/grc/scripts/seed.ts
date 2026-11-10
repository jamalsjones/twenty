import { ROUTES } from '../src/domain/routes';
import {
  callPublicRoute,
  callRoute,
  createMany,
  type CreatedRecord,
  listAll,
  update,
  wait,
} from './lib/api';
import {
  type ImportedRequirement,
  importFramework,
  readMappings,
} from './lib/ciso-library';
import {
  ASSETS,
  AUDITS,
  CONTROLS,
  EXCEPTIONS,
  FINDINGS,
  INCIDENTS,
  POLICIES,
  RISKS,
  SOC2_CRITERIA_BY_DOMAIN,
  VENDORS,
  type VendorSeed,
} from './data/program';

const MILLISECONDS_PER_DAY = 86_400_000;
const MINIMUM_CROSSWALK_STRENGTH = 8;

const dayFromNow = (offsetInDays: number) =>
  new Date(Date.now() + offsetInDays * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
const momentFromNow = (offsetInDays: number) =>
  new Date(Date.now() + offsetInDays * MILLISECONDS_PER_DAY).toISOString();
const usd = (amount: number) => ({
  amountMicros: amount * 1_000_000,
  currencyCode: 'USD',
});
const byName = <TRecord extends CreatedRecord>(records: TRecord[]) =>
  new Map(records.map((record) => [record.name, record.id]));

// Deterministic spread so reseeding produces the same demo.
const spread = (seed: number, modulo: number) => (seed * 7919 + 13) % modulo;

const seed = async () => {
  const existing = await listAll<CreatedRecord>('vendors');

  if (existing.length > 0) {
    throw new Error(
      'This workspace already has GRC vendors. Seed an empty workspace to avoid duplicates.',
    );
  }

  const members = await listAll<{ id: string }>('workspaceMembers');
  const ownerFor = (index: number) => members[index % members.length]?.id;

  console.log('Importing frameworks from CISO Assistant');
  const csf = await importFramework('nist-csf-2.0.yaml');
  const iso = await importFramework('iso27001-2022.yaml');
  const soc2 = await importFramework('soc2_2017_with_rev_2022.yaml');
  await importFramework('vendor-due-diligence.yaml', {
    kind: 'QUESTIONNAIRE',
    scope: 'REFERENCE',
  });

  console.log('Creating policies, controls and mappings');
  const policies = await createMany(
    'policies',
    POLICIES.map(
      (
        [refId, name, category, status, version, reviewInDays, attestationRate],
        index,
      ) => ({
        name,
        refId,
        category,
        status,
        version,
        attestationRate,
        approver:
          status === 'DRAFT' || status === 'IN_REVIEW'
            ? ''
            : 'Security Steering Committee',
        reviewCycleMonths: 12,
        effectiveDate: dayFromNow(reviewInDays - 365),
        lastReviewedAt: dayFromNow(reviewInDays - 365),
        nextReviewDate: dayFromNow(reviewInDays),
        summary: `Sets the requirements for ${name.replace(/ Policy$/, '').toLowerCase()} across the company.`,
        ownerId: ownerFor(index),
      }),
    ),
  );
  const policyIdByRef = new Map(
    POLICIES.map(([refId], index) => [refId, policies[index].id]),
  );

  const CONTROL_STATUS: Record<string, string> = {
    IMPLEMENTING: 'IMPLEMENTING',
    DRAFT: 'DRAFT',
  };
  const controls = await createMany(
    'controls',
    CONTROLS.map(
      (
        [
          refId,
          name,
          domain,
          controlType,
          automation,
          testFrequency,
          policyRefId,
          ,
          state,
        ],
        index,
      ) => ({
        name,
        refId,
        domain,
        controlType,
        automation,
        testFrequency,
        status: CONTROL_STATUS[state] ?? 'OPERATIONAL',
        effectiveness: 'NOT_TESTED',
        statement: `${name}.`,
        policyId: policyIdByRef.get(policyRefId),
        ownerId: ownerFor(index),
      }),
    ),
  );
  const controlIdByRef = new Map(
    CONTROLS.map(([refId], index) => [refId, controls[index].id]),
  );

  // Each control is mapped by hand to NIST CSF. Coverage reaches ISO 27001
  // through CISO Assistant's crosswalk, keeping only strong relationships so
  // a loose "intersect" never counts as covered. SOC 2 has no crosswalk that
  // strong, so it uses the coarse criteria-family mapping from the demo data.
  const requirementByUrn = new Map(
    [...csf.requirements, ...iso.requirements].map((requirement) => [
      requirement.sourceUrn,
      requirement,
    ]),
  );
  const csfByRef = new Map(
    csf.requirements.map((requirement) => [requirement.refId, requirement]),
  );
  const csfToIso = readMappings(
    'mapping-nist-csf-2.0-to-iso27001-2022.yaml',
  ).filter(
    (mapping) =>
      ['equal', 'subset'].includes(mapping.relationship) ||
      mapping.strength >= MINIMUM_CROSSWALK_STRENGTH,
  );
  const mappingRows = new Map<string, Record<string, unknown>>();
  const addMapping = (
    controlRefId: string,
    requirement: ImportedRequirement | undefined,
    origin: string,
  ) => {
    const key = `${controlRefId}:${requirement?.id}`;

    if (!requirement?.assessable || mappingRows.has(key)) return;

    mappingRows.set(key, {
      name: `${controlRefId} → ${requirement.refId}`,
      controlId: controlIdByRef.get(controlRefId),
      requirementId: requirement.id,
      origin,
    });
  };

  for (const [controlRefId, , domain, , , , , frameworkRefIds] of CONTROLS) {
    for (const csfRefId of frameworkRefIds) {
      const csfRequirement = csfByRef.get(csfRefId);

      if (!csfRequirement) {
        console.warn(
          `Unknown NIST CSF reference ${csfRefId} on ${controlRefId}`,
        );
        continue;
      }

      addMapping(controlRefId, csfRequirement, 'DIRECT');
      csfToIso
        .filter((mapping) => mapping.sourceUrn === csfRequirement.sourceUrn)
        .forEach((mapping) =>
          addMapping(
            controlRefId,
            requirementByUrn.get(mapping.targetUrn),
            'CROSSWALK',
          ),
        );
    }

    const criteria = SOC2_CRITERIA_BY_DOMAIN[domain] ?? [];

    soc2.requirements
      .filter((requirement) =>
        criteria.some((criterion) =>
          requirement.refId?.startsWith(`${criterion}.`),
        ),
      )
      .forEach((requirement) =>
        addMapping(controlRefId, requirement, 'DIRECT'),
      );
  }

  await createMany('controlRequirements', [...mappingRows.values()]);
  console.log(`Mapped controls to ${mappingRows.size} requirements`);

  const tested = CONTROLS.filter(([, , , , , , , , state]) =>
    ['PASS', 'PASS_WITH_EXCEPTIONS', 'FAIL'].includes(state),
  );

  await createMany(
    'controlTests',
    tested.map(([refId, name, , , , , , , result], index) => ({
      name: `${refId} operating effectiveness test`,
      controlId: controlIdByRef.get(refId),
      result,
      performedAt: dayFromNow(-(10 + spread(index, 70))),
      period: 'Q3 2026',
      tester: 'Internal Audit',
      sampleSize: 25,
      exceptionCount: result === 'PASS' ? 0 : result === 'FAIL' ? 6 : 2,
      notes:
        result === 'FAIL'
          ? `Control did not operate as designed: ${name.toLowerCase()}.`
          : '',
    })),
  );
  await createMany(
    'evidences',
    tested.map(([refId, name], index) => ({
      name: `${refId} evidence: ${name}`,
      controlId: controlIdByRef.get(refId),
      status: ['ACCEPTED', 'ACCEPTED', 'COLLECTED', 'REQUESTED'][
        spread(index, 4)
      ],
      kind: ['EXPORT', 'SCREENSHOT', 'REPORT', 'DOCUMENT'][spread(index, 4)],
      source: [
        'Identity provider',
        'Cloud console',
        'Ticketing system',
        'SIEM',
        'HRIS',
      ][spread(index, 5)],
      collectedAt: dayFromNow(-(5 + spread(index, 60))),
      validUntil: dayFromNow(
        spread(index, 9) === 0 ? -4 : 30 + spread(index, 300),
      ),
    })),
  );

  console.log('Creating vendors and contracts');
  const VENDOR_STATUS_AT_START: Record<VendorSeed['journey'], string> = {
    APPROVED: 'DUE_DILIGENCE',
    REMEDIATION: 'DUE_DILIGENCE',
    REJECTED: 'DUE_DILIGENCE',
    SUBMITTED: 'DUE_DILIGENCE',
    SENT: 'DUE_DILIGENCE',
    INTAKE: 'INTAKE',
  };
  const vendors = await createMany(
    'vendors',
    VENDORS.map((vendor, index) => ({
      name: vendor.name,
      serviceDescription: vendor.service,
      category: vendor.category,
      criticality: vendor.criticality,
      dataClassification: vendor.dataClassification,
      systemAccess: vendor.systemAccess,
      dataTypes: vendor.dataTypes,
      certifications: vendor.certifications,
      annualSpend: usd(vendor.spendThousands * 1000),
      country: vendor.country,
      status: VENDOR_STATUS_AT_START[vendor.journey],
      website: {
        primaryLinkUrl: `https://${vendor.name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
      },
      contactName: 'Security Team',
      contactEmail: {
        primaryEmail: `security@${vendor.name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
      },
      ownerId: ownerFor(index),
    })),
  );
  const vendorIdByName = byName(vendors);
  const handlesSensitiveData = (vendor: VendorSeed) =>
    ['CONFIDENTIAL', 'RESTRICTED'].includes(vendor.dataClassification);

  const contractRows = VENDORS.flatMap((vendor, index) => {
    if (vendor.journey === 'INTAKE') return [];

    const isLive = ['APPROVED', 'REMEDIATION'].includes(vendor.journey);
    const expiresInDays = [-9, 24, 55, 130, 210, 320, 480][spread(index, 7)];
    const hasWeakPaper = vendor.maturity < 0.7;
    const master = {
      name: `${vendor.name} master services agreement`,
      reference: `CTR-2026-${String(index * 2 + 1).padStart(3, '0')}`,
      vendorId: vendorIdByName.get(vendor.name),
      contractType: 'MSA',
      status: isLive
        ? 'ACTIVE'
        : ['LEGAL_REVIEW', 'NEGOTIATION', 'SIGNATURE', 'DRAFT'][
            spread(index, 4)
          ],
      totalValue: usd(vendor.spendThousands * 3000),
      annualValue: usd(vendor.spendThousands * 1000),
      effectiveDate: dayFromNow(expiresInDays - 1095),
      expirationDate: dayFromNow(expiresInDays),
      renewalNoticeDate: dayFromNow(expiresInDays - 60),
      autoRenew: spread(index, 3) !== 0,
      noticePeriodDays: 60,
      termMonths: 36,
      governingLaw:
        vendor.country === 'United States' ? 'Delaware, USA' : vendor.country,
      clauses: hasWeakPaper
        ? ['LIABILITY_CAP', 'TERMINATION_FOR_CONVENIENCE']
        : [
            'LIABILITY_CAP',
            'AUDIT_RIGHT',
            'BREACH_NOTIFICATION',
            'SLA_CREDITS',
            'CYBER_INSURANCE',
            'TERMINATION_FOR_CONVENIENCE',
          ],
      breachNotificationHours: hasWeakPaper ? null : 72,
      liabilityCap: usd(vendor.spendThousands * 2000),
      riskRating: hasWeakPaper ? 'HIGH' : 'LOW',
      ownerId: ownerFor(index + 2),
    };

    if (!handlesSensitiveData(vendor) || hasWeakPaper) return [master];

    return [
      master,
      {
        ...master,
        name: `${vendor.name} data processing addendum`,
        reference: `CTR-2026-${String(index * 2 + 2).padStart(3, '0')}`,
        contractType: 'DPA',
        totalValue: null,
        annualValue: null,
        liabilityCap: null,
        clauses: [
          'DPA',
          'SCC',
          'BREACH_NOTIFICATION',
          'SUBPROCESSOR_APPROVAL',
          'DATA_RETURN',
          'AUDIT_RIGHT',
        ],
      },
    ];
  });
  const contracts = await createMany('contracts', contractRows);

  await createMany(
    'contractObligations',
    contracts
      .filter((contract) => contract.name.endsWith('master services agreement'))
      .slice(0, 12)
      .flatMap((contract, index) => [
        {
          name: 'Provide current SOC 2 report',
          contractId: contract.id,
          party: 'VENDOR',
          category: 'SECURITY',
          frequency: 'ANNUAL',
          status: ['MET', 'OPEN', 'AT_RISK'][spread(index, 3)],
          dueDate: dayFromNow(20 + spread(index, 200)),
        },
        {
          name: '99.9% monthly availability',
          contractId: contract.id,
          party: 'VENDOR',
          category: 'SERVICE_LEVEL',
          frequency: 'MONTHLY',
          status: spread(index, 5) === 0 ? 'BREACHED' : 'MET',
          dueDate: dayFromNow(spread(index, 28)),
        },
      ]),
  );

  console.log('Running vendors through the assessment flow');
  const ANSWER_CYCLE = ['YES', 'YES', 'YES', 'PARTIAL', 'NO'];

  for (const [index, vendor] of VENDORS.entries()) {
    if (vendor.journey === 'INTAKE') continue;

    const vendorId = vendorIdByName.get(vendor.name);
    const { assessmentId } = await callRoute<{ assessmentId: string }>(
      ROUTES.launchAssessment,
      { vendorId },
    );

    if (vendor.journey === 'SENT') {
      await update('vendorAssessments', assessmentId, {
        stage: 'QUESTIONNAIRE_SENT',
        sentAt: momentFromNow(-3),
      });
      continue;
    }

    const [assessment] = await listAll<{ portalToken: string }>(
      'vendorAssessments',
      `id[eq]:"${assessmentId}"`,
    );
    const responses = await listAll<{ id: string }>(
      'assessmentResponses',
      `assessmentId[eq]:"${assessmentId}"`,
    );

    // Answers go through the public portal, exactly as a vendor would submit.
    await callPublicRoute(`${ROUTES.vendorPortal}/${assessment.portalToken}`, {
      answers: responses.map((response, position) => {
        const roll = spread(index * 31 + position, 100) / 100;
        const answer =
          roll < vendor.maturity
            ? 'YES'
            : ANSWER_CYCLE[3 + (spread(position + index, 2) % 2)];

        return {
          id: response.id,
          answer,
          comment: answer === 'YES' ? '' : 'Planned for the next two quarters.',
        };
      }),
    });

    if (vendor.journey !== 'SUBMITTED') {
      await callRoute(ROUTES.completeAssessment, {
        assessmentId,
        decision: vendor.journey,
      });
    }
  }

  console.log(
    'Creating assets, risks, audits, findings, incidents and exceptions',
  );
  const assets = await createMany(
    'assets',
    ASSETS.map(
      ([
        name,
        kind,
        criticality,
        dataClassification,
        ownerTeam,
        vendorName,
      ]) => ({
        name,
        kind,
        criticality,
        dataClassification,
        ownerTeam,
        vendorId: vendorIdByName.get(vendorName ?? ''),
      }),
    ),
  );
  const risks = await createMany(
    'risks',
    RISKS.map(
      (
        [
          refId,
          name,
          category,
          inherentLikelihood,
          inherentImpact,
          residualLikelihood,
          residualImpact,
          treatment,
          status,
          ,
          vendorName,
        ],
        index,
      ) => ({
        name,
        refId,
        category,
        inherentLikelihood: `L${inherentLikelihood}`,
        inherentImpact: `I${inherentImpact}`,
        residualLikelihood: `L${residualLikelihood}`,
        residualImpact: `I${residualImpact}`,
        treatment,
        status,
        scenario: `${name}.`,
        reviewDate: dayFromNow(15 + spread(index, 150)),
        vendorId: vendorIdByName.get(vendorName ?? ''),
        assetId: assets[spread(index, assets.length)].id,
        ownerId: ownerFor(index + 1),
      }),
    ),
  );

  await createMany(
    'riskControls',
    RISKS.flatMap(([refId, , , , , , , , , controlRefIds], index) =>
      controlRefIds.map((controlRefId) => ({
        name: `${refId} ↔ ${controlRefId}`,
        riskId: risks[index].id,
        controlId: controlIdByRef.get(controlRefId),
      })),
    ),
  );

  const frameworkIdByRef = new Map<string | null, string>([
    ['NIST-CSF-2.0', csf.framework.id],
    ['ISO27001-2022', iso.framework.id],
    ['SOC2-2017-Rev-2022', soc2.framework.id],
  ]);
  const audits = await createMany(
    'audits',
    AUDITS.map(
      ([
        name,
        kind,
        status,
        frameworkRefId,
        auditor,
        startInDays,
        endInDays,
        scope,
      ]) => ({
        name,
        kind,
        status,
        auditor,
        scope,
        frameworkId: frameworkIdByRef.get(frameworkRefId),
        startDate: dayFromNow(startInDays),
        endDate: dayFromNow(endInDays),
      }),
    ),
  );
  const auditIdByName = byName(audits);

  await createMany(
    'findings',
    FINDINGS.map(
      ([name, severity, status, source, dueInDays, details, link], index) => ({
        name,
        refId: `FND-${String(index + 1).padStart(3, '0')}`,
        severity,
        status,
        source,
        details,
        dueDate: dayFromNow(dueInDays),
        closedAt: status === 'CLOSED' ? dayFromNow(dueInDays) : null,
        auditId: auditIdByName.get(link.auditName ?? ''),
        controlId: controlIdByRef.get(link.controlRefId ?? ''),
        vendorId: vendorIdByName.get(link.vendorName ?? ''),
        ownerId: ownerFor(index + 3),
      }),
    ),
  );
  await createMany(
    'incidents',
    INCIDENTS.map(
      (
        [
          refId,
          name,
          severity,
          status,
          category,
          detectedDaysAgo,
          resolvedDaysAgo,
          notifiable,
          impact,
          rootCause,
          vendorName,
        ],
        index,
      ) => ({
        name,
        refId,
        severity,
        status,
        category,
        impact,
        rootCause,
        notifiable,
        detectedAt: momentFromNow(-detectedDaysAgo),
        resolvedAt:
          resolvedDaysAgo === null ? null : momentFromNow(-resolvedDaysAgo),
        notificationDeadline: notifiable
          ? momentFromNow(3 - detectedDaysAgo)
          : null,
        vendorId: vendorIdByName.get(vendorName ?? ''),
        assetId: assets[spread(index, assets.length)].id,
      }),
    ),
  );
  await createMany(
    'policyExceptions',
    EXCEPTIONS.map(
      ([
        name,
        status,
        policyRefId,
        controlRefId,
        riskLevel,
        requestedBy,
        approvedBy,
        expiresInDays,
        justification,
        compensatingControls,
      ]) => ({
        name,
        status,
        riskLevel,
        requestedBy,
        approvedBy,
        justification,
        compensatingControls,
        policyId: policyIdByRef.get(policyRefId),
        controlId: controlIdByRef.get(controlRefId),
        expiresAt: dayFromNow(expiresInDays),
      }),
    ),
  );

  // Control tests update their controls asynchronously on the worker queue.
  console.log('Waiting for automation to settle, then rolling up compliance');
  await wait(20_000);
  await callRoute(ROUTES.runMonitor, {});
  const rollup = await callRoute(ROUTES.recomputeCompliance, {});

  console.log('Seed complete', rollup);
};

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
