import * as core from '@actions/core';
import * as github from '@actions/github';
import type { GeneratorConfig, SectionName, Badge } from './types/config.js';
import { ALL_SECTIONS, isSectionName } from './types/config.js';
import { ConfigError } from './utils/errors.js';
import { debug } from './utils/logger.js';
import { detectVersion } from './utils/version.js';
import { validateBadges } from './utils/badges.js';
import { loadExamples } from './utils/examples.js';

/**
 * Parse a comma-separated list of section names
 */
function parseSections(input: string, inputName: string): SectionName[] {
  if (!input.trim()) {
    return [];
  }

  const sections: SectionName[] = [];
  const parts = input.split(',').map((s) => s.trim().toLowerCase());

  for (const part of parts) {
    if (!part) continue;

    if (isSectionName(part)) {
      sections.push(part);
    } else {
      throw new ConfigError(
        `Invalid section '${part}' in ${inputName}. Valid sections: ${ALL_SECTIONS.join(', ')}`
      );
    }
  }

  return sections;
}

/**
 * Parse and validate header level input
 */
function parseHeaderLevel(input: string): 1 | 2 | 3 {
  const level = parseInt(input, 10);
  if (isNaN(level) || level < 1 || level > 3) {
    throw new ConfigError('header-level must be 1, 2, or 3');
  }
  return level as 1 | 2 | 3;
}

/**
 * Parse and validate badges JSON input
 */
function parseBadges(input: string): Badge[] {
  if (!input || input === '[]') {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    throw new ConfigError(
      `Invalid badges JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ConfigError('badges must be a JSON array');
  }

  return validateBadges(parsed);
}

/**
 * Get repository URL from GitHub context or environment
 */
function getRepositoryUrl(): string {
  if (github.context.repo.owner && github.context.repo.repo) {
    return `${github.context.repo.owner}/${github.context.repo.repo}`;
  }

  const envRepo = process.env.GITHUB_REPOSITORY;
  if (envRepo) {
    return envRepo;
  }

  throw new ConfigError(
    'Could not detect repository. Please provide repository-url input.'
  );
}

/**
 * Load configuration from action inputs
 */
export async function loadConfig(): Promise<GeneratorConfig> {
  const actionPath = core.getInput('action-path') || './action.yaml';
  const outputPath = core.getInput('output-path') || './README.md';
  const templatePath = core.getInput('template-path') || undefined;
  const license = core.getInput('license') || 'MIT';
  const example = core.getInput('example') || undefined;
  const examplesPath = core.getInput('examples-path') || '';
  const contributingUrl = core.getInput('contributing-url') || undefined;
  const repositoryUrlInput = core.getInput('repository-url') || '';
  const versionInput = core.getInput('version') || '';

  const badges = parseBadges(core.getInput('badges') || '[]');
  const includeSections = parseSections(core.getInput('include-sections') || '', 'include-sections');
  const excludeSections = parseSections(core.getInput('exclude-sections') || '', 'exclude-sections');
  const headerLevel = parseHeaderLevel(core.getInput('header-level') || '1');
  const repositoryUrl = repositoryUrlInput || getRepositoryUrl();

  const examples = examplesPath ? await loadExamples(examplesPath) : [];

  let version: string;
  if (versionInput && versionInput !== 'auto') {
    version = versionInput;
  } else {
    version = await detectVersion();
  }

  debug(`Configuration loaded:`);
  debug(`  actionPath: ${actionPath}`);
  debug(`  outputPath: ${outputPath}`);
  debug(`  templatePath: ${templatePath || '(default)'}`);
  debug(`  license: ${license}`);
  debug(`  repositoryUrl: ${repositoryUrl}`);
  debug(`  version: ${version}`);
  debug(`  examples: ${examples.length} loaded`);

  return {
    actionPath,
    outputPath,
    templatePath,
    license,
    badges,
    includeSections,
    excludeSections,
    example,
    examples,
    contributingUrl,
    repositoryUrl,
    version,
    headerLevel,
  };
}
