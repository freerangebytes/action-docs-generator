import Handlebars from 'handlebars';
import { context } from '@actions/github';
import type { GenerationResult, Permission, TemplateContext, TemplateExample } from '../types/template.js';
import type { ActionMetadata } from '../schemas/action-metadata.js';
import type { Example } from '../schemas/example-config.js';
import type { ResolvedConfig } from '../config/resolve.js';
import { SECTION_NAMES } from '../schemas/input-schema.js';
import { DEFAULT_TEMPLATE } from './templates.js';
import { debug } from '../utils/logger.js';
import { renderYamlEntry } from '../utils/yaml.js';
import { TemplateError } from '../utils/errors.js';
import { registerHelpers } from './helpers.js';

// Indentation of the `with:` entries inside a generated workflow step.
const WITH_BLOCK_INDENT = 4;

const getRepoName = (): string => `${context.repo.owner}/${context.repo.repo}`;

/**
 * Get the sections to include based on the config.
 */
const getSections = (config: ResolvedConfig): string[] => {
  if (config.includeSections.length > 0) {
    return config.includeSections;
  }
  if (config.excludeSections.length > 0) {
    return SECTION_NAMES.filter((section) => !config.excludeSections.includes(section));
  }
  return [...SECTION_NAMES];
};

/**
 * Resolved lazily: `getRepoName()` throws outside GitHub Actions, and the
 * default template never renders this value.
 */
const getRepositoryUrl = (config: ResolvedConfig): (() => string) => () =>
  config.repositoryUrl ?? `https://github.com/${getRepoName()}`;

/**
 * Convert the permissions config to an array of Permission objects.
 */
const getPermissions = (config: ResolvedConfig): Permission[] =>
  Object.entries(config.permissions.value ?? {}).map(([name, level]) => ({ name, level }));

/**
 * Build a `with:` block from the inputs a caller has to set, plus the optional
 * ones carrying a meaningful default. Optional inputs defaulting to an empty
 * string are omitted; listing them adds a blank line per input and no guidance.
 */
const buildWithBlock = (metadata: ActionMetadata): string =>
  metadata.inputs
    .filter((input) => input.required || (input.default !== undefined && input.default !== ''))
    .map((input) =>
      input.required && !input.default
        ? `    ${input.id}: # required`
        : renderYamlEntry(input.id, input.default ?? '', WITH_BLOCK_INDENT)
    )
    .join('\n');

/**
 * Generate the basic usage snippet from the action's own metadata.
 */
const buildUsage = (metadata: ActionMetadata, config: ResolvedConfig): string => {
  const withBlock = buildWithBlock(metadata);
  const step = `- uses: ${getRepoName()}@${config.version}`;

  return withBlock ? `${step}\n  with:\n${withBlock}` : step;
};

/**
 * Render a single configured example into a workflow step.
 */
const renderExample = (
  example: Example,
  metadata: ActionMetadata,
  repoName: string,
  defaultVersion: string
): string => {
  const lines = [
    `- name: ${example.name ?? metadata.name}`,
    `  uses: ${repoName}@${example.version ?? defaultVersion}`,
  ];

  if (example.with && Object.keys(example.with).length > 0) {
    lines.push('  with:');
    for (const [key, value] of Object.entries(example.with)) {
      lines.push(renderYamlEntry(key, value, WITH_BLOCK_INDENT));
    }
  }

  return lines.join('\n');
};

/**
 * Get the custom examples of the action. The `example` shorthand is treated as
 * a single pre-rendered snippet.
 */
const getExamples = (metadata: ActionMetadata, config: ResolvedConfig): TemplateExample[] => {
  if (config.example) {
    return [
      {
        title: 'Basic Example',
        description: 'A basic example of how to use the action.',
        content: config.example,
      },
    ];
  }

  const repoName = getRepoName();

  return (config.examples.value ?? []).map((example) => ({
    title: example.title,
    description: example.description,
    content: renderExample(example, metadata, repoName, config.version),
  }));
};

/**
 * Generates the context needed for the template.
 */
const generateContext = (metadata: ActionMetadata, config: ResolvedConfig): TemplateContext => {
  const sections = getSections(config);
  const hasSection = Object.fromEntries(
    SECTION_NAMES.map((name) => [name, sections.includes(name)])
  ) as Record<string, boolean>;

  return {
    badges: config.badges.value ?? [],
    contributing: config.contributing.value,
    contributingPath: config.contributing.path,
    description: config.description.value ?? metadata.description,
    examples: getExamples(metadata, config),
    generatedAt: new Date().toISOString(),
    hasSection: hasSection,
    headerLevel: config.headerLevel,
    includeGeneratedDate: config.includeGeneratedDate,
    inputs: metadata.inputs,
    license: config.license,
    licenseContent: config.licenseContent,
    licensePath: config.licensePath,
    name: metadata.name,
    outputs: metadata.outputs,
    permissions: getPermissions(config),
    repositoryUrl: getRepositoryUrl(config),
    runtime: metadata.runs.using,
    sections: sections,
    usage: buildUsage(metadata, config),
    version: config.version,
    year: new Date().getFullYear(),
  };
};

/**
 * Create a template engine and render a template in one step
 */
export const renderTemplate = (metadata: ActionMetadata, config: ResolvedConfig): GenerationResult => {
  const handlebars = Handlebars.create();
  registerHelpers(handlebars, config.headerLevel);

  debug(`Rendering template '${config.template.path ?? 'default'}'`);
  const templateContext = generateContext(metadata, config);

  let content: string;
  try {
    const compiled = handlebars.compile(config.template.value ?? DEFAULT_TEMPLATE);
    content = compiled(templateContext);
  } catch (err) {
    const source = config.template.path ?? (config.template.value ? 'inline template' : 'default template');
    throw new TemplateError(`${source}: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return {
    content,
    outputPath: config.outputPath,
    sectionsGenerated: templateContext.sections,
  };
};
