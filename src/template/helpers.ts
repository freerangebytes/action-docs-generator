import type Handlebars from 'handlebars';
import { registerFormatHelpers } from './helpers/formatters.js';
import { registerConditionalHelpers } from './helpers/conditionals.js';
import { registerGeneratorHelpers } from './helpers/generators.js';

/**
 * Register all custom Handlebars helpers
 */
export function registerHelpers(handlebars: typeof Handlebars, baseHeaderLevel: number): void {
  registerFormatHelpers(handlebars);
  registerConditionalHelpers(handlebars);
  registerGeneratorHelpers(handlebars, baseHeaderLevel);
}
