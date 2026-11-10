import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parse } from 'yaml';

import { createMany, type CreatedRecord } from './api';

// Framework content is read from a local checkout of CISO Assistant
// (https://github.com/intuitem/ciso-assistant-community, AGPL-3.0) at import
// time. It is never copied into this repository: several libraries carry the
// copyright of their publisher.
const REPOSITORY_URL = 'https://github.com/intuitem/ciso-assistant-community';
// Scripts run from the app directory through the package.json scripts.
const DEFAULT_CHECKOUT = path.resolve('.cache/ciso-assistant-community');
const LIBRARY_DIRECTORY = 'backend/library/libraries';

type Translations = Record<string, { name?: string; description?: string }>;
type RequirementNode = {
  urn: string;
  parent_urn?: string;
  ref_id?: string;
  name?: string;
  description?: string;
  assessable?: boolean;
  depth?: number;
  translations?: Translations;
};
type Library = {
  urn: string;
  locale: string;
  ref_id: string;
  name: string;
  description?: string;
  copyright?: string;
  version?: number;
  provider?: string;
  translations?: Translations;
  objects: {
    framework?: { urn: string; requirement_nodes: RequirementNode[] };
    requirement_mapping_sets?: {
      requirement_mappings: {
        source_requirement_urn: string;
        target_requirement_urn: string;
        relationship?: string;
        strength_of_relationship?: number;
      }[];
    }[];
  };
};

export const resolveLibraryPath = (fileName: string) => {
  const checkout = process.env.CISO_ASSISTANT_PATH ?? DEFAULT_CHECKOUT;

  if (!existsSync(checkout)) {
    console.log(`Cloning ${REPOSITORY_URL} into ${checkout}`);
    execFileSync('git', ['clone', '--depth', '1', REPOSITORY_URL, checkout], {
      stdio: 'inherit',
      env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' },
    });
  }

  return path.join(checkout, LIBRARY_DIRECTORY, fileName);
};

const readLibrary = (fileName: string) =>
  parse(readFileSync(resolveLibraryPath(fileName), 'utf8')) as Library;

const inEnglish = (
  source: { name?: string; description?: string; translations?: Translations },
  locale: string,
) => (locale === 'en' ? source : { ...source, ...source.translations?.en });

const MAX_NAME_LENGTH = 120;

const truncate = (value: string) =>
  value.length > MAX_NAME_LENGTH
    ? `${value.slice(0, MAX_NAME_LENGTH - 1)}…`
    : value;

export type ImportOptions = {
  kind?: 'STANDARD' | 'REGULATION' | 'QUESTIONNAIRE' | 'INTERNAL';
  scope?: 'IN_SCOPE' | 'PLANNED' | 'REFERENCE';
};

export type ImportedRequirement = CreatedRecord & {
  refId: string | null;
  sourceUrn: string;
  assessable: boolean;
};

export const importFramework = async (
  fileName: string,
  options: ImportOptions = {},
) => {
  const library = readLibrary(fileName);
  const nodes = library.objects.framework?.requirement_nodes;

  if (!nodes) throw new Error(`${fileName} does not contain a framework`);

  const header = inEnglish(library, library.locale);
  const [framework] = await createMany('frameworks', [
    {
      name: header.name,
      refId: library.ref_id,
      provider: library.provider,
      version: String(library.version ?? ''),
      kind: options.kind ?? 'STANDARD',
      scope: options.scope ?? 'IN_SCOPE',
      summary: header.description?.slice(0, 2000),
      copyright: library.copyright,
      sourceUrn: library.objects.framework?.urn,
    },
  ]);
  const nodeByUrn = new Map(nodes.map((node) => [node.urn, node]));
  const sectionOf = (node: RequirementNode) => {
    let current = node;

    while (current.parent_urn && nodeByUrn.has(current.parent_urn)) {
      current = nodeByUrn.get(current.parent_urn) as RequirementNode;
    }

    const section = inEnglish(current, library.locale);

    return [current.ref_id, section.name].filter(Boolean).join(' · ');
  };

  const requirements = await createMany<ImportedRequirement>(
    'requirements',
    nodes.map((node, index) => {
      const text = inEnglish(node, library.locale);
      const title = text.name ?? text.description ?? node.urn;

      return {
        name: truncate([node.ref_id, title].filter(Boolean).join(' ')),
        refId: node.ref_id,
        frameworkId: framework.id,
        section: sectionOf(node),
        parentRefId: nodeByUrn.get(node.parent_urn ?? '')?.ref_id,
        statement: (text.description ?? text.name)?.slice(0, 4000),
        assessable: node.assessable ?? false,
        depth: node.depth ?? 1,
        sortOrder: index,
        sourceUrn: node.urn,
      };
    }),
  );

  console.log(
    `Imported ${header.name}: ${requirements.length} nodes, ${requirements.filter((requirement) => requirement.assessable).length} assessable`,
  );

  return { framework, requirements };
};

export const readMappings = (fileName: string) =>
  (readLibrary(fileName).objects.requirement_mapping_sets ?? []).flatMap(
    (set) =>
      set.requirement_mappings.map((mapping) => ({
        sourceUrn: mapping.source_requirement_urn,
        targetUrn: mapping.target_requirement_urn,
        relationship: mapping.relationship ?? 'intersect',
        strength: mapping.strength_of_relationship ?? 0,
      })),
  );
