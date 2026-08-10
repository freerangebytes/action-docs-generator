import { z } from 'zod';

// Max lengths for action metadata fields to prevent memory issues
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_INPUT_DESCRIPTION_LENGTH = 500;
const MAX_DEFAULT_LENGTH = 1000;

// YAML parses unquoted scalars by type, so `default: 3` and `default: true` arrive
// as a number and a boolean. Accept them and stringify in the transform below.
const yamlScalar = z.union([z.string(), z.number(), z.boolean()]);

const descriptionField = yamlScalar
  .transform(String)
  .pipe(z.string().max(MAX_INPUT_DESCRIPTION_LENGTH));

const inputEntrySchema = z.object({
  description: descriptionField,
  required: z.union([z.boolean(), z.string().transform((s) => s.toLowerCase().trim())]).optional(),
  default: yamlScalar.transform(String).pipe(z.string().max(MAX_DEFAULT_LENGTH)).optional(),
});

const outputEntrySchema = z.object({
  description: descriptionField,
});

const runsSchema = z.object({
  using: z.string().trim().min(1).max(50),
});

const rawActionYamlSchema = z.object({
  name: yamlScalar.transform(String).pipe(z.string().trim().min(1).max(MAX_NAME_LENGTH)),
  description: yamlScalar
    .transform(String)
    .pipe(z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH)),
  runs: runsSchema,
  inputs: z.record(z.string().max(100), inputEntrySchema).optional(),
  outputs: z.record(z.string().max(100), outputEntrySchema).optional(),
});

export const actionMetadataSchema = rawActionYamlSchema.transform((raw) => ({
  name: raw.name,
  description: raw.description,
  runs: raw.runs,
  inputs: Object.entries(raw.inputs ?? {}).map(([id, input]) => ({
    id,
    description: input.description,
    default: input.default,
    required: input.required === true || input.required === 'true',
  })),
  outputs: Object.entries(raw.outputs ?? {}).map(([id, output]) => ({
    id,
    description: output.description,
  }))
}));

export type ActionMetadata = z.infer<typeof actionMetadataSchema>;

// The shapes templates actually receive: post-transform, carrying `id` and a
// normalized boolean `required`. Deriving these from the pre-transform entry
// schemas would omit `id` and mistype `required`.
export type ActionInput = ActionMetadata['inputs'][number];
export type ActionOutput = ActionMetadata['outputs'][number];
