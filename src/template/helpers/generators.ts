import type Handlebars from 'handlebars';
import { extractNodeVersion } from './formatters.js';

/**
 * Register output generation helpers
 */
export function registerGeneratorHelpers(
  handlebars: typeof Handlebars,
  baseHeaderLevel: number
): void {
  handlebars.registerHelper('h', (level: number) => {
    const actualLevel = Math.min(baseHeaderLevel + level - 1, 6);
    return '#'.repeat(actualLevel);
  });

  handlebars.registerHelper('nodeVersion', (using: string) => extractNodeVersion(using));

  handlebars.registerHelper(
    'inputComment',
    function (input: { id: string; description: string; default?: string }) {
      const comment =
        input.default !== undefined
          ? `# ${input.id}: '${input.default}'`
          : `# ${input.id}: # ${input.description}`;
      return new handlebars.SafeString(comment);
    }
  );

  handlebars.registerHelper(
    'inputCommentFull',
    function (input: { id: string; description: string; default?: string }) {
      const comment =
        input.default !== undefined
          ? `#   ${input.id}: '${input.default}'`
          : `#   ${input.id}: # ${input.description}`;
      return new handlebars.SafeString(comment);
    }
  );

  // Format a YAML value, using literal block style for multi-line strings
  handlebars.registerHelper('yamlValue', function (value: unknown, indent: number) {
    if (typeof value !== 'string') return '';
    if (!value.includes('\n')) return value;

    const spaces = ' '.repeat(indent);
    const lines = value.split('\n').map((line) => `${spaces}${line}`);
    return new handlebars.SafeString(`|\n${lines.join('\n')}`);
  });
}
