import yaml from 'yaml';
import { z } from 'zod';
import type { Badge } from '../schemas/badge-config.js';
import type { Example } from '../schemas/example-config.js';
import type { ContentSource, ResolvedSection } from '../schemas/content-source.js';
import type { ActionInputs } from '../schemas/input-schema.js';
import { permissionsSchema, sectionValueSchemas } from '../schemas/input-schema.js';
import { ConfigError } from '../utils/errors.js';
import { fileExists, readFile } from '../utils/file-system.js';
import { zodErrorToValidationError } from '../utils/zod.js';
import { detectVersion } from '../utils/version.js';
import { debug } from '../utils/logger.js';

type Permissions = z.infer<typeof permissionsSchema>;

type ResolvedKeys =
  | 'description'
  | 'contributing'
  | 'template'
  | 'badges'
  | 'permissions'
  | 'examples'
  | 'version';

/**
 * Action inputs with every content source resolved to its value.
 */
export interface ResolvedConfig extends Omit<ActionInputs, ResolvedKeys> {
  description: ResolvedSection<string>;
  contributing: ResolvedSection<string>;
  template: ResolvedSection<string>;
  badges: ResolvedSection<Badge[]>;
  permissions: ResolvedSection<Permissions>;
  examples: ResolvedSection<Example[]>;
  licenseContent?: string;
  version: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validate = <T>(schema: z.ZodType<T>, value: unknown, path: string): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConfigError(`Validation failed for ${path}: ${zodErrorToValidationError(result.error).message}`);
  }
  return result.data;
};

const readSectionFile = async (path: string): Promise<string> => {
  if (!(await fileExists(path))) {
    throw new ConfigError(`File not found: ${path}`);
  }
  return await readFile(path);
};

/**
 * Read a YAML or JSON section file. Contents may be the bare value or wrapped
 * under a key matching the section name.
 */
export const loadStructuredFile = async <T>(
  path: string,
  key: string,
  schema: z.ZodType<T>
): Promise<T> => {
  const raw = await readSectionFile(path);

  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch (err) {
    throw new ConfigError(
      `Failed to parse ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }

  return validate(schema, isRecord(parsed) && key in parsed ? parsed[key] : parsed, path);
};

const loadTextFile = async <T>(path: string, schema: z.ZodType<T>): Promise<T> =>
  validate(schema, (await readSectionFile(path)).trim(), path);

/**
 * Resolve one section. `schema` must be the same schema the inline branch was
 * validated with, so a `-path` input cannot bypass its constraints.
 */
const resolveSection = async <T>(
  source: ContentSource<T>,
  key: string,
  schema: z.ZodType<T>,
  structured: boolean
): Promise<ResolvedSection<T>> => {
  if (source.content !== undefined) {
    return { value: source.content };
  }
  if (!source.path) {
    return {};
  }

  debug(`Resolving '${key}' from ${source.path}`);
  const value = structured
    ? await loadStructuredFile(source.path, key, schema)
    : await loadTextFile(source.path, schema);

  return { value, path: source.path };
};

/**
 * Resolve every content source, reading and validating referenced files.
 */
export const resolveConfig = async (input: ActionInputs): Promise<ResolvedConfig> => {
  // The schemas come from sectionValueSchemas, the same ones the inline inputs
  // are parsed with, so file-loaded content is held to identical length and
  // shape constraints.
  const [description, contributing, template, badges, permissions, examples] = await Promise.all([
    resolveSection(input.description, 'description', sectionValueSchemas.description, false),
    resolveSection(input.contributing, 'contributing', sectionValueSchemas.contributing, false),
    resolveSection(input.template, 'template', sectionValueSchemas.template, false),
    resolveSection(input.badges, 'badges', sectionValueSchemas.badges, true),
    resolveSection(input.permissions, 'permissions', sectionValueSchemas.permissions, true),
    resolveSection(input.examples, 'examples', sectionValueSchemas.examples, true),
  ]);

  return {
    ...input,
    description,
    contributing,
    template,
    badges,
    permissions,
    examples,
    licenseContent: input.loadLicenseFileContent && input.licensePath
      ? (await readSectionFile(input.licensePath)).trim()
      : undefined,
    version: input.version ?? (await detectVersion(input.githubToken)),
  };
};
