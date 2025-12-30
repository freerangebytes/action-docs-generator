import { z } from 'zod';

// Matches tags, branches, or commit SHAs
const versionPattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

// Matches GitHub Actions input parameter names
const inputNamePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const exampleSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  name: z.string().min(3).max(100).optional(),
  version: z.string().min(1).max(100).regex(versionPattern, 'Invalid version format').optional(),
  with: z.record(
    z.string().regex(inputNamePattern, 'Invalid input name'),
    z.string().max(1000)
  ).optional(),
});

export const examplesConfigSchema = z.object({
  examples: z.array(exampleSchema).min(1).max(50),
});

export type Example = z.infer<typeof exampleSchema>;
export type ExamplesConfig = z.infer<typeof examplesConfigSchema>;
