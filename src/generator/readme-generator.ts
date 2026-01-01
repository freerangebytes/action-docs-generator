import type { ActionMetadata } from '../types/action-metadata.js';
import type { GeneratorConfig, SectionName } from '../types/config.js';
import type { TemplateContext, GenerationResult } from '../types/template.js';
import { ALL_SECTIONS } from '../types/config.js';
import { renderTemplate } from '../template/engine.js';
import { writeFile } from '../utils/file-system.js';
import { info, debug } from '../utils/logger.js';

/**
 * Generate a README from action metadata and configuration
 */
export async function generateReadme(
  metadata: ActionMetadata,
  config: GeneratorConfig
): Promise<GenerationResult> {
  const sectionsToInclude = determineSections(config);
  debug(`Sections to include: ${sectionsToInclude.join(', ')}`);

  const context = buildContext(metadata, config, sectionsToInclude);

  info('Rendering README template...');
  const content = await renderTemplate(context, config.templatePath);

  info(`Writing README to: ${config.outputPath}`);
  const outputPath = await writeFile(config.outputPath, content);

  return {
    content,
    outputPath,
    sectionsGenerated: sectionsToInclude,
  };
}

/**
 * Determine which sections to include based on configuration
 */
function determineSections(config: GeneratorConfig): SectionName[] {
  let sections: SectionName[];

  if (config.includeSections.length > 0) {
    // Use only the explicitly included sections
    sections = config.includeSections;
  } else {
    // Start with all sections
    sections = [...ALL_SECTIONS];
  }

  // Remove excluded sections
  if (config.excludeSections.length > 0) {
    sections = sections.filter((s) => !config.excludeSections.includes(s));
  }

  return sections;
}

/**
 * Build the template context from metadata and configuration
 */
function buildContext(
  metadata: ActionMetadata,
  config: GeneratorConfig,
  sections: SectionName[]
): TemplateContext {
  // Build hasSection map for easy template conditionals
  const hasSection = Object.fromEntries(
    ALL_SECTIONS.map((section) => [section, sections.includes(section)])
  ) as Record<SectionName, boolean>;

  // Apply description override if provided
  const effectiveMetadata = config.description
    ? { ...metadata, description: config.description }
    : metadata;

  return {
    action: effectiveMetadata,
    config: {
      license: config.license,
      badges: config.badges,
      examples: config.examples,
      repositoryUrl: config.repositoryUrl,
      contributingUrl: config.contributingUrl,
      example: config.example,
      version: config.version,
      headerLevel: config.headerLevel,
    },
    helpers: {
      year: new Date().getFullYear(),
      generatedAt: new Date().toISOString().slice(0, 10),
      sections,
    },
    hasSection,
  };
}
