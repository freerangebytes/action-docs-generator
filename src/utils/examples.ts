import { parse as parseYaml } from 'yaml';
import { examplesConfigSchema, type Example } from '../schemas/example-config.js';
import { ConfigError } from './errors.js';
import { readFile, fileExists } from './file-system.js';
import { formatZodErrors } from './zod-errors.js';

/**
 * Load and validate examples from a YAML file.
 * Expects a valid file path - throws if file doesn't exist.
 */
export async function loadExamples(examplesPath: string): Promise<Example[]> {
  if (!(await fileExists(examplesPath))) {
    throw new ConfigError(`Examples file not found: ${examplesPath}`);
  }

  const content = await readFile(examplesPath);

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (err) {
    throw new ConfigError(
      `Failed to parse examples file: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }

  const result = examplesConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(`Validation failed:\n  ${formatZodErrors(result.error)}`);
  }

  return result.data.examples;
}
