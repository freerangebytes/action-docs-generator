import type { ActionInput, ActionOutput } from '../schemas/action-metadata.js';
import type { Badge } from '../schemas/badge-config.js';

export interface Permission {
  name: string;
  level: 'read' | 'write' | 'none';
}

export interface TemplateExample {
  title: string;
  description: string;
  content: string;
}

/**
 * Context object passed to Handlebars template
 */
export interface TemplateContext {
  badges: Badge[]; // The badges of the action
  contributing?: string; // Contributing guidance to inline
  contributingPath?: string; // The path to the contributing file
  description: string; // The description of the action
  examples: TemplateExample[]; // Custom examples for the action
  generatedAt: string; // The date and time the README was generated
  hasSection: Record<string, boolean>; // The sections that are present in the action
  headerLevel: number; // The header level of the action
  includeGeneratedDate: boolean; // Whether to render the generated-at date
  inputs: ActionInput[];
  license: string; // The license identifier of the action
  licenseContent?: string; // The license body, when inlined
  licensePath?: string; // The path to the license file
  name: string; // The name of the action
  outputs: ActionOutput[];
  permissions: Permission[]; // The permissions of the action
  // Lazy: resolving it requires GitHub Actions context, and most templates
  // never reference it. Handlebars invokes context functions on use.
  repositoryUrl: () => string;
  runtime: string; // The runtime of the action
  sections: string[]; // The sections of the action
  usage: string; // The generated basic usage snippet
  version: string; // The version of the action
  year: number; // The year of the action
}

/**
 * Result of README generation
 */
export interface GenerationResult {
  content: string; // The content of the README
  outputPath: string; // The path to the README
  sectionsGenerated: string[]; // The sections that were generated
}
