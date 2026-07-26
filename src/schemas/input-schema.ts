import { z } from 'zod';
import { badgeSchema } from './badge-config.js';
import { exampleSchema } from './example-config.js';
import { versionSchema } from './version-schema.js';
import { contentSource, pathField } from './content-source.js';

const MIN_DESCRIPTION_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 5000;
const MIN_LICENSE_LENGTH = 3;
const MAX_LICENSE_LENGTH = 50;
const MAX_CONTRIBUTING_LENGTH = 20000;
const MAX_TEMPLATE_LENGTH = 100000;
const MAX_SECTION_LIST_LENGTH = 20;
const MIN_EXAMPLE_LENGTH = 20;
const MAX_EXAMPLE_LENGTH = 1000;
const MAX_BADGES = 20;
const MAX_EXAMPLES = 50;

// All available section names (source of truth for SectionName type)
export const SECTION_NAMES = [
    'title',
    'badges',
    'description',
    'requirements',
    'permissions',
    'inputs',
    'outputs',
    'usage',
    'examples',
    'contributing',
    'license',
  ] as const;

const permissionLevel = z.enum(['read', 'write', 'none']);

// Permission names are emitted verbatim into a fenced YAML block, so they are
// held to the shape GitHub's own scopes take (`contents`, `pull-requests`).
// Anything looser lets a newline or a backtick corrupt the block.
const permissionNamePattern = /^[a-zA-Z][a-zA-Z0-9-]*$/;

export const permissionsSchema = z.record(
  z.string().trim().min(3).max(30).regex(permissionNamePattern, 'Invalid permission name'),
  permissionLevel
);

const urlField = z.string().trim().max(200).regex(
    /^https?:\/\/[^\s]+$/,
    { message: 'Must be a valid URL' }
  ).optional()

const sectionNameSchema = z.enum(SECTION_NAMES);

// Sections accepting inline content or a path to a file containing it. Declared
// once here so `config/resolve.ts` can validate file-loaded content against the
// identical schema rather than a looser copy.
const sectionSources = {
  description: contentSource(
    z.string().trim().min(MIN_DESCRIPTION_LENGTH).max(MAX_DESCRIPTION_LENGTH)
  ),
  contributing: contentSource(z.string().trim().min(1).max(MAX_CONTRIBUTING_LENGTH)),
  template: contentSource(z.string().trim().min(1).max(MAX_TEMPLATE_LENGTH)),
  badges: contentSource(z.array(badgeSchema).max(MAX_BADGES)),
  permissions: contentSource(permissionsSchema),
  examples: contentSource(z.array(exampleSchema).max(MAX_EXAMPLES)),
} as const;

/**
 * The value schema behind each content section, keyed by section name.
 */
export const sectionValueSchemas = {
  description: sectionSources.description.valueSchema,
  contributing: sectionSources.contributing.valueSchema,
  template: sectionSources.template.valueSchema,
  badges: sectionSources.badges.valueSchema,
  permissions: sectionSources.permissions.valueSchema,
  examples: sectionSources.examples.valueSchema,
};

export const inputObjectSchema = z.object({
    actionPath: pathField,
    outputPath: pathField,

    description: sectionSources.description,
    contributing: sectionSources.contributing,
    template: sectionSources.template,
    badges: sectionSources.badges,
    permissions: sectionSources.permissions,
    examples: sectionSources.examples,

    // Not a content source: `license` is an identifier rendered as a name,
    // while `licensePath` is a link target in the README.
    license: z.string().trim().min(MIN_LICENSE_LENGTH).max(MAX_LICENSE_LENGTH),
    licensePath: pathField.optional(),
    loadLicenseFileContent: z.boolean(),

    // Shorthand for a single hand-written snippet, not a second form of `examples`.
    example: z.string().trim().min(MIN_EXAMPLE_LENGTH).max(MAX_EXAMPLE_LENGTH).optional(),

    includeSections: z.array(sectionNameSchema).max(MAX_SECTION_LIST_LENGTH),
    excludeSections: z.array(sectionNameSchema).max(MAX_SECTION_LIST_LENGTH),
    repositoryUrl: urlField,
    headerLevel: z.number().int().min(1).max(3),
    includeGeneratedDate: z.boolean(),
    version: versionSchema.optional(),
    githubToken: z.string().optional(),
  });

export const inputSchema = inputObjectSchema
  .refine(
    (data) => !(data.includeSections.length > 0 && data.excludeSections.length > 0),
    { message: 'Cannot specify both include-sections and exclude-sections', path: ['includeSections'] }
  )
  .refine(
    (data) =>
      !(
        (data.examples.content !== undefined || data.examples.path !== undefined) &&
        data.example !== undefined
      ),
    { message: 'Cannot specify both example and examples', path: ['example'] }
  )
  .refine(
    (data) => !(data.loadLicenseFileContent && !data.licensePath),
    { message: 'license-path is required when load-license-file-content is true', path: ['licensePath'] }
  );

export type ActionInputs = z.infer<typeof inputSchema>;
export type SectionName = (typeof SECTION_NAMES)[number];
