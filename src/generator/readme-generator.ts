import type { GenerationResult } from '../types/template.js';
import { renderTemplate } from '../template/engine.js';
import { writeFile } from '../utils/file-system.js';
import { info } from '../utils/logger.js';
import type { ResolvedConfig } from '../config/resolve.js';
import type { ActionMetadata } from '../schemas/action-metadata.js';

/**
 * Generate a README from action metadata and configuration
 */
export async function generateReadme(
  config: ResolvedConfig,
  metadata: ActionMetadata,
): Promise<GenerationResult> {
  info('Rendering README template...');
  const renderResult = renderTemplate(metadata, config);

  info(`Writing README to: ${config.outputPath}`);
  // writeFile returns the resolved absolute path, which is what the
  // `readme-path` output is documented to be.
  const resolvedPath = await writeFile(config.outputPath, renderResult.content);

  return { ...renderResult, outputPath: resolvedPath };
}
