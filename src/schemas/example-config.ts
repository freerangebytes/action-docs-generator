import { z } from 'zod';
import { versionSchema } from './version-schema.js';

// Matches GitHub Actions input parameter names
const inputNamePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const exampleSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  name: z.string().min(3).max(100).optional(),
  version: versionSchema.optional(),
  with: z.record(
    z.string().trim().regex(inputNamePattern, 'Invalid input name'),
    z.string().trim().min(1).max(1000)
  ).optional(),
});

// The array bound lives on the `examples` section in input-schema.ts, which is
// what both the inline input and a `-path` file are parsed with. A second array
// schema here only invited the two to drift.
export type Example = z.infer<typeof exampleSchema>;
