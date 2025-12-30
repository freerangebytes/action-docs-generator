import { parse } from 'yaml';
import type {
  ActionMetadata,
  ActionInput,
  ActionOutput,
  RawActionYaml,
} from '../types/action-metadata.js';
import { readFile, fileExists } from '../utils/file-system.js';
import { YamlParseError, FileNotFoundError } from '../utils/errors.js';
import { validateActionYaml } from './validators.js';
import { debug } from '../utils/logger.js';

/**
 * Resolve action file path, trying .yaml and .yml extensions
 */
async function resolveActionPath(basePath: string): Promise<string> {
  // If path already has extension, use it directly
  if (basePath.endsWith('.yaml') || basePath.endsWith('.yml')) {
    return basePath;
  }

  // Try .yaml first, then .yml
  const yamlPath = `${basePath}.yaml`;
  if (await fileExists(yamlPath)) return yamlPath;

  const ymlPath = `${basePath}.yml`;
  if (await fileExists(ymlPath)) return ymlPath;

  throw new FileNotFoundError(`${basePath} (tried .yaml and .yml extensions)`);
}

/**
 * Parse an action.yaml or action.yml file and return structured metadata
 */
export async function parseActionYaml(actionPath: string): Promise<ActionMetadata> {
  debug(`Parsing action file: ${actionPath}`);

  const path = await resolveActionPath(actionPath);
  const content = await readFile(path);

  debug(`Found action file at: ${path}`);

  let rawYaml: unknown;
  try {
    rawYaml = parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new YamlParseError(path, message);
  }

  // Validates and narrows type to RawActionYaml
  validateActionYaml(rawYaml);

  return transformToMetadata(rawYaml);
}

/**
 * Transform raw YAML structure to typed ActionMetadata
 */
function transformToMetadata(raw: RawActionYaml): ActionMetadata {
  return {
    name: raw.name.trim(),
    description: raw.description.trim(),
    inputs: transformInputs(raw.inputs),
    outputs: transformOutputs(raw.outputs),
    runs: {
      using: raw.runs.using,
    },
  };
}

/**
 * Transform inputs from Record to Array format
 */
function transformInputs(
  inputs?: Record<
    string,
    {
      description: string;
      required?: boolean | string;
      default?: string;
    }
  >
): ActionInput[] {
  if (!inputs) {
    return [];
  }

  return Object.entries(inputs).map(([id, input]) => ({
    id,
    description: input.description.trim(),
    required: parseBoolean(input.required),
    default: input.default,
  }));
}

/**
 * Transform outputs from Record to Array format
 */
function transformOutputs(
  outputs?: Record<
    string,
    {
      description: string;
    }
  >
): ActionOutput[] {
  if (!outputs) {
    return [];
  }

  return Object.entries(outputs).map(([id, output]) => ({
    id,
    description: output.description.trim(),
  }));
}

/**
 * Parse a boolean value that might be a string.
 * Follows YAML 1.2.2 Core Schema (used by GitHub Actions).
 * Only accepts: true | True | TRUE | false | False | FALSE
 */
function parseBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return false;
}
