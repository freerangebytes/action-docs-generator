import { stringify } from 'yaml';

/**
 * Values YAML would otherwise resolve to a non-string type. Every value in a
 * GitHub Actions `with:` block is a string regardless, so quoting these adds
 * noise without removing any ambiguity — and it keeps generated snippets
 * looking like what an action author would actually write.
 */
const PLAIN_SAFE_AMBIGUOUS = /^(-?\d+(\.\d+)?|true|false|null|yes|no|on|off|~)$/i;

/**
 * Render a string as a YAML scalar suitable for the right-hand side of a
 * `key: value` pair, quoting or switching to a literal block as needed.
 *
 * Continuation lines of a block scalar are indented by `blockIndent`, which
 * must be greater than the indentation of the key itself.
 */
export function renderYamlValue(value: string, blockIndent: number): string {
  if (PLAIN_SAFE_AMBIGUOUS.test(value)) {
    return value;
  }

  // Normalize CRLF so a literal block does not carry stray carriage returns.
  const rendered = stringify(value.replace(/\r\n/g, '\n'), { lineWidth: 0 }).trimEnd();

  const [first, ...rest] = rendered.split('\n');
  if (rest.length === 0) {
    return first ?? '';
  }

  const pad = ' '.repeat(blockIndent);
  return [first, ...rest.map((line) => (line ? `${pad}${line}` : ''))].join('\n');
}

/**
 * Render a single `key: value` line at the given indentation, handling
 * multi-line and otherwise-unsafe values.
 */
export function renderYamlEntry(key: string, value: string, indent: number): string {
  const pad = ' '.repeat(indent);
  return `${pad}${key}: ${renderYamlValue(value, indent + 2)}`;
}
