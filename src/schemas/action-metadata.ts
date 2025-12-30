import { z } from 'zod';

// Max lengths for action metadata fields to prevent memory issues
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_INPUT_DESCRIPTION_LENGTH = 500;
const MAX_DEFAULT_LENGTH = 1000;

const inputEntrySchema = z.object({
  description: z.string().max(MAX_INPUT_DESCRIPTION_LENGTH),
  required: z.union([z.boolean(), z.string()]).optional(),
  default: z.string().max(MAX_DEFAULT_LENGTH).optional(),
});

const outputEntrySchema = z.object({
  description: z.string().max(MAX_INPUT_DESCRIPTION_LENGTH),
});

const runsSchema = z.object({
  using: z.string().trim().min(1).max(50),
});

export const rawActionYamlSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  description: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH),
  runs: runsSchema,
  inputs: z.record(z.string().max(100), inputEntrySchema).optional(),
  outputs: z.record(z.string().max(100), outputEntrySchema).optional(),
});

export type RawActionYaml = z.infer<typeof rawActionYamlSchema>;
