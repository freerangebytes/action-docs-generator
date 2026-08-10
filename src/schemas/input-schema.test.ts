import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';
import { inputObjectSchema, inputSchema, SECTION_NAMES } from './input-schema.js';

const CONTENT_SECTIONS = [
  'description',
  'contributing',
  'template',
  'badges',
  'permissions',
  'examples',
] as const;

// Inputs that are intentionally not fields on the schema by the same name.
const SCHEMA_ALIASES: Record<string, string> = {
  'description-path': 'description',
  'contributing-path': 'contributing',
  'template-path': 'template',
  'badges-path': 'badges',
  'permissions-path': 'permissions',
  'examples-path': 'examples',
  'license-path': 'licensePath',
  'load-license-file-content': 'loadLicenseFileContent',
  'action-path': 'actionPath',
  'output-path': 'outputPath',
  'include-sections': 'includeSections',
  'exclude-sections': 'excludeSections',
  'repository-url': 'repositoryUrl',
  'header-level': 'headerLevel',
  'include-generated-date': 'includeGeneratedDate',
  'github-token': 'githubToken',
};

const actionYaml = yaml.parse(readFileSync(join(process.cwd(), 'action.yaml'), 'utf-8')) as {
  inputs: Record<string, { description: string; default?: string }>;
};

const declaredInputs = Object.keys(actionYaml.inputs);
const schemaFields = Object.keys(inputObjectSchema.shape);

const baseInput = {
  actionPath: './action.yaml',
  outputPath: './README.md',
  description: {},
  contributing: {},
  template: {},
  badges: {},
  permissions: {},
  examples: {},
  license: 'MIT',
  loadLicenseFileContent: false,
  includeSections: [],
  excludeSections: [],
  headerLevel: 1,
  includeGeneratedDate: false,
};

describe('action.yaml and inputSchema stay in sync', () => {
  it('every declared input maps to a schema field', () => {
    const unmapped = declaredInputs.filter((name) => {
      const field = SCHEMA_ALIASES[name] ?? name;
      return !schemaFields.includes(field);
    });

    expect(unmapped).toEqual([]);
  });

  it('every schema field is reachable from a declared input', () => {
    const reachable = new Set(declaredInputs.map((name) => SCHEMA_ALIASES[name] ?? name));
    const unreachable = schemaFields.filter((field) => !reachable.has(field));

    expect(unreachable).toEqual([]);
  });

  it('every content section declares both an inline and a path input', () => {
    for (const name of CONTENT_SECTIONS) {
      expect(declaredInputs).toContain(name);
      expect(declaredInputs).toContain(`${name}-path`);
    }
  });

  it('documents every section name in include-sections', () => {
    const described = actionYaml.inputs['include-sections']?.description ?? '';

    for (const section of SECTION_NAMES) {
      expect(described).toContain(section);
    }
  });
});

describe('inputSchema', () => {
  it('accepts the defaults declared in action.yaml', () => {
    expect(inputSchema.safeParse(baseInput).success).toBe(true);
  });

  it('rejects a section given both inline content and a path', () => {
    const result = inputSchema.safeParse({
      ...baseInput,
      description: { content: 'Inline description', path: './DESCRIPTION.md' },
    });

    expect(result.success).toBe(false);
  });

  it('accepts a section given only inline content', () => {
    expect(
      inputSchema.safeParse({ ...baseInput, description: { content: 'Inline description' } }).success
    ).toBe(true);
  });

  it('accepts a section given only a path', () => {
    expect(
      inputSchema.safeParse({ ...baseInput, description: { path: './DESCRIPTION.md' } }).success
    ).toBe(true);
  });

  it('rejects both include-sections and exclude-sections', () => {
    const result = inputSchema.safeParse({
      ...baseInput,
      includeSections: ['title'],
      excludeSections: ['license'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unknown section name', () => {
    expect(inputSchema.safeParse({ ...baseInput, includeSections: ['nope'] }).success).toBe(false);
  });

  it('rejects load-license-file-content without a license path', () => {
    expect(
      inputSchema.safeParse({ ...baseInput, loadLicenseFileContent: true }).success
    ).toBe(false);
  });

  it('rejects both example and examples', () => {
    const result = inputSchema.safeParse({
      ...baseInput,
      example: '- uses: owner/repo@v1\n  with:\n    a: b',
      examples: { content: [{ title: 'One', description: 'A description here' }] },
    });

    expect(result.success).toBe(false);
  });
});
