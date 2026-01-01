import type { Badge } from '../schemas/badge-config.js';
import type { Example } from '../schemas/example-config.js';

// Re-export types from schemas (schemas are the source of truth)
export type { Badge, Example };

// All available section names (source of truth for SectionName type)
export const ALL_SECTIONS = [
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

// Derived from ALL_SECTIONS to ensure type and array stay in sync
export type SectionName = (typeof ALL_SECTIONS)[number];

/**
 * Type guard to check if a string is a valid SectionName
 */
export function isSectionName(value: string): value is SectionName {
  return ALL_SECTIONS.includes(value as SectionName);
}

/**
 * Configuration derived from action inputs
 */
export interface GeneratorConfig {
  /** Path to source action.yaml file */
  actionPath: string;
  /** Path for generated README output */
  outputPath: string;
  /** Optional custom template path */
  templatePath?: string;
  /** License type or custom text */
  license: string;
  /** Badge configurations */
  badges: Badge[];
  /** Sections to include (empty = all) */
  includeSections: SectionName[];
  /** Sections to exclude */
  excludeSections: SectionName[];
  /** Custom usage example YAML */
  example?: string;
  /** Custom examples */
  examples: Example[];
  /** Contributing guidelines URL */
  contributingUrl?: string;
  /** Repository URL for links */
  repositoryUrl: string;
  /** Version tag to use in examples (e.g., v1, main, latest) */
  version: string;
  /** Starting header level (1-3) */
  headerLevel: 1 | 2 | 3;
  /** Custom description override */
  description?: string;
}
