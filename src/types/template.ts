import type { ActionMetadata } from './action-metadata.js';
import type { Badge, Example, SectionName } from './config.js';

/**
 * Context object passed to Handlebars template
 */
export interface TemplateContext {
  /** Parsed action metadata */
  action: ActionMetadata;
  /** Configuration for generation */
  config: {
    license: string;
    badges: Badge[];
    examples: Example[];
    repositoryUrl: string;
    contributingUrl?: string;
    example?: string;
    version: string;
    headerLevel: number;
  };
  /** Helper data for template logic */
  helpers: {
    /** Current year for copyright */
    year: number;
    /** Generated timestamp */
    generatedAt: string;
    /** Sections being rendered */
    sections: SectionName[];
  };
  /** Whether specific sections are included */
  hasSection: Record<SectionName, boolean>;
}

/**
 * Result of README generation
 */
export interface GenerationResult {
  /** Generated README content */
  content: string;
  /** Absolute path where README was written */
  outputPath: string;
  /** Sections that were generated */
  sectionsGenerated: SectionName[];
}
