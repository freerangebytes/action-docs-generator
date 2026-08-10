import type Handlebars from 'handlebars';
import { extractNodeVersion } from './formatters.js';
import { renderYamlValue } from '../../utils/yaml.js';

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

  // Render an input as a commented-out `with:` entry. `indent` is the number of
  // spaces after the '#', which is the only thing the former `inputCommentFull`
  // varied — pass 2 for the nested form.
  handlebars.registerHelper(
    'inputComment',
    function (input: { id: string; description: string; default?: string }, indent: unknown) {
      const pad = ' '.repeat(typeof indent === 'number' ? indent : 0);
      const body =
        input.default !== undefined
          ? `${input.id}: '${input.default}'`
          : `${input.id}: # ${input.description}`;
      return new handlebars.SafeString(`#${pad} ${body}`);
    }
  );

  // Format a YAML value, quoting or switching to a literal block as needed.
  handlebars.registerHelper('yamlValue', function (value: unknown, indent: unknown) {
    if (typeof value !== 'string') return '';
    const blockIndent = typeof indent === 'number' ? indent : 0;
    return new handlebars.SafeString(renderYamlValue(value, blockIndent));
  });
}
