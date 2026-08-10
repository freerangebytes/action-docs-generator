import { parse } from 'yaml';
import {
  actionMetadataSchema,
  type ActionMetadata } from '../schemas/action-metadata.js';
import { readFile, fileExists } from '../utils/file-system.js';
import { YamlParseError, FileNotFoundError, ValidationError } from '../utils/errors.js';
import { debug } from '../utils/logger.js';
import { parseWithSchema } from '../utils/zod.js';

/**
 * Turn a raw schema failure into guidance aimed at whoever wrote the
 * action.yaml, whose most common mistakes are a missing top-level field or an
 * input/output declared without a description.
 */
function describeMetadataFailure(error: ValidationError, path: string): ValidationError {
  const field = error.message.match(/Validation failed for '([^']+)'/)?.[1] ?? 'root';

  const entryMatch = /^(inputs|outputs)\.([^.]+)\.description$/.exec(field);
  if (entryMatch) {
    const [, kind, name] = entryMatch;
    return new ValidationError(
      field,
      `${path}: ${kind === 'inputs' ? 'input' : 'output'} '${name ?? ''}' is missing a description`
    );
  }

  const guidance: Record<string, string> = {
    root: 'must be a valid YAML object',
    name: "'name' is required and must be a non-empty string",
    description: "'description' is required and must be a non-empty string",
    runs: "'runs' must be an object with a 'using' field",
    'runs.using': "'runs.using' is required (for example: node24, docker, composite)",
    inputs: "'inputs' must be a mapping of input name to definition",
    outputs: "'outputs' must be a mapping of output name to definition",
  };

  const hint = guidance[field];
  return hint ? new ValidationError(field, `${path}: ${hint}`) : error;
}

/**
 * Resolve action file path, trying .yaml and .yml extensions.
 * @throws FileNotFoundError if the action file is not found
 * @throws PathTraversalError if the action file path escapes the base directory
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
 * Parse an action.yaml or action.yml file and return structured metadata.
 * @throws FileNotFoundError if the action file is not found
 * @throws YamlParseError if the action file is not a valid YAML file
 * @throws ValidationError if the action file is not a valid action.yaml file
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

  try {
    return parseWithSchema(actionMetadataSchema, rawYaml);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw describeMetadataFailure(error, path);
    }
    throw error;
  }
}
