import Handlebars from 'handlebars';
import type { TemplateContext } from '../types/template.js';
import { readFile, fileExists } from '../utils/file-system.js';
import { TemplateError } from '../utils/errors.js';
import { registerHelpers } from './helpers.js';
import { DEFAULT_TEMPLATE } from './default-template.js';
import { debug } from '../utils/logger.js';

/**
 * Template engine wrapper for Handlebars
 */
export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private compiledTemplate: Handlebars.TemplateDelegate | null = null;

  constructor(headerLevel = 1) {
    // Create isolated Handlebars instance
    this.handlebars = Handlebars.create();
    registerHelpers(this.handlebars, headerLevel);
  }

  /**
   * Load and compile a template from a file or use the default
   */
  async loadTemplate(templatePath?: string): Promise<void> {
    let templateSource: string;

    if (templatePath && (await fileExists(templatePath))) {
      debug(`Loading custom template from: ${templatePath}`);
      templateSource = await readFile(templatePath);
    } else {
      debug('Using default template');
      templateSource = DEFAULT_TEMPLATE;
    }

    try {
      this.compiledTemplate = this.handlebars.compile(templateSource, {
        strict: false,
        noEscape: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TemplateError(`Failed to compile template: ${message}`);
    }
  }

  /**
   * Render the template with the given context
   */
  render(context: TemplateContext): string {
    if (!this.compiledTemplate) {
      throw new TemplateError('Template not loaded. Call loadTemplate() first.');
    }

    try {
      return this.compiledTemplate(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TemplateError(`Failed to render template: ${message}`);
    }
  }
}

/**
 * Create a template engine and render a template in one step
 */
export async function renderTemplate(
  context: TemplateContext,
  templatePath?: string
): Promise<string> {
  const engine = new TemplateEngine(context.config.headerLevel);
  await engine.loadTemplate(templatePath);
  return engine.render(context);
}
