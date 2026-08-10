import * as core from '@actions/core';
import { parseActionYaml } from './parser/action-parser.js';
import { generateReadme } from './generator/readme-generator.js';
import { info, error, warning, group } from './utils/logger.js';
import type { GenerationResult } from './types/template.js';
import { ActionInputs, inputSchema } from './schemas/input-schema.js';
import { resolveConfig } from './config/resolve.js';
import { parseWithSchema } from './utils/zod.js';
import { ConfigError } from './utils/errors.js';

/**
 * Parses a string with comma separated values and returns an array.
 *
 * Blank entries are dropped rather than passed on: a trailing comma is a typo,
 * not a request for a section whose name is the empty string, and reporting it
 * as one is no help to whoever wrote it.
 *
 * @param input A string of comma separated values.
 * @returns An array of the values with spaces trimmed. An empty string yields an empty array.
 */
function parseCommaString(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function optional(name: string): string | undefined {
  return core.getInput(name) || undefined;
}

/**
 * Reads a boolean input, defaulting to false when it is not set. A value that
 * is set but not boolean is still rejected.
 */
function booleanInput(name: string): boolean {
  return core.getInput(name) ? core.getBooleanInput(name) : false;
}

/**
 * Reads a numeric input. A blank or non-numeric value is reported against the
 * input's own name here, rather than reaching the schema as NaN and surfacing
 * as the unhelpful "expected number, received NaN".
 */
function numberInput(name: string): number {
  const raw = core.getInput(name).trim();
  const value = Number(raw);

  if (raw === '' || !Number.isFinite(value)) {
    throw new ConfigError(`'${name}' must be a number, got '${raw}'`);
  }

  return value;
}

function parseJson(name: string, raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(
      `Invalid JSON in '${name}': ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Reads a section supplied either inline as `<name>` or as `<name>-path`.
 */
function section(name: string, json = false): { content?: unknown; path?: string } {
  const raw = core.getInput(name);
  return {
    content: raw ? (json ? parseJson(name, raw) : raw) : undefined,
    path: optional(`${name}-path`),
  };
}

/** Exported for testing: reads and validates every action input. */
export async function loadInput(): Promise<ActionInputs> {
  const rawInput = {
    actionPath: core.getInput('action-path'),
    outputPath: core.getInput('output-path'),

    description: section('description'),
    contributing: section('contributing'),
    template: section('template'),
    badges: section('badges', true),
    permissions: section('permissions', true),
    examples: section('examples', true),

    license: core.getInput('license'),
    licensePath: optional('license-path'),
    loadLicenseFileContent: booleanInput('load-license-file-content'),

    example: optional('example'),
    includeSections: parseCommaString(core.getInput('include-sections')),
    excludeSections: parseCommaString(core.getInput('exclude-sections')),
    repositoryUrl: optional('repository-url'),
    headerLevel: numberInput('header-level'),
    includeGeneratedDate: booleanInput('include-generated-date'),
    version: optional('version'),
    githubToken: optional('github-token'),
  }
  return parseWithSchema(inputSchema, rawInput);
}

/**
 * Write the job summary. `core.summary.write()` throws when GITHUB_STEP_SUMMARY
 * is unset (running outside Actions, or a runner without summary support), and
 * that must not fail a run whose README was already written successfully.
 */
async function writeSummary(actionName: string, result: GenerationResult): Promise<void> {
  try {
    await core.summary
      .addHeading('README Generated')
      .addTable([
        [
          { data: 'Action', header: true },
          { data: 'Output Path', header: true },
          { data: 'Sections', header: true },
        ],
        [actionName, result.outputPath, result.sectionsGenerated.length.toString()],
      ])
      .addDetails('Sections Generated', result.sectionsGenerated.join(', '))
      .write();
  } catch (err) {
    warning(`Could not write job summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
  try {
    const input = await group('Loading configuration', async () => {
      const i = await loadInput();
      info(`Action path: ${i.actionPath}`);
      info(`Output path: ${i.outputPath}`);
      return i;
    });

    const metadata = await group('Parsing action metadata', async () => {
      const meta = await parseActionYaml(input.actionPath);
      info(`Action name: ${meta.name}`);
      info(`Inputs: ${meta.inputs.length}, Outputs: ${meta.outputs.length}`);
      return meta;
    });

    const config = await group('Resolving configuration', async () => {
      return resolveConfig(input);
    });

    const result = await group('Generating README', async () => {
      return generateReadme(config, metadata);
    });

    core.setOutput('readme-path', result.outputPath);
    core.setOutput('content', result.content);
    core.setOutput('sections-generated', JSON.stringify(result.sectionsGenerated));

    await writeSummary(metadata.name, result);

    info(`README generated successfully!`);
    info(`  Path: ${result.outputPath}`);
    info(`  Sections: ${result.sectionsGenerated.join(', ')}`);
  } catch (err) {
    if (err instanceof Error) {
      error(err);
      core.setFailed(err.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}
