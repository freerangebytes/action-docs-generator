import type Handlebars from 'handlebars';

/**
 * URL encode a value for use in badge URLs.
 * Accepts unknown because Handlebars may pass unexpected types.
 */
export function urlEncode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return encodeURIComponent(value).replace(/-/g, '--').replace(/_/g, '__');
}

/**
 * Escape content for markdown table cells.
 *
 * The result is returned to Handlebars as a SafeString, so this must do the
 * full job: `|` and newlines would break the table, and `<`/`>` would let the
 * documented action.yaml inject raw HTML. Quotes, ampersands and backticks are
 * deliberately left alone — Handlebars' HTML escaping turned them into entities
 * like `&quot;`, which is noise in a markdown file and breaks code spans.
 *
 * Accepts unknown because Handlebars may pass unexpected types.
 */
export function escapeTableCell(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render a default value as an inline code span, or `-` when there is none.
 *
 * A code span closes at the next run of exactly as many backticks as opened it,
 * so the fence has to be longer than the longest run inside the value: a `` ``
 * fence around ``a``b`` would end at the interior pair and leave the remainder
 * to render as markdown. The padding spaces are stripped by the renderer and
 * keep a leading or trailing backtick inside the span.
 *
 * Accepts unknown because Handlebars may pass unexpected types.
 */
export function formatDefault(value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    return '-';
  }

  const escaped = value.replace(/(\\*)\|/g, '$1$1\\|').replace(/\r?\n/g, ' ');
  const longestRun = Math.max(0, ...(escaped.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longestRun + 1);
  const pad = longestRun > 0 ? ' ' : '';

  return `${fence}${pad}${escaped}${pad}${fence}`;
}

/**
 * Extract Node.js version number from runtime string.
 * Accepts unknown because Handlebars may pass unexpected types.
 */
export function extractNodeVersion(using: unknown): string {
  if (typeof using !== 'string') return '';
  const match = using.match(/node(\d+)/);
  return match?.[1] ?? '';
}

/**
 * Register formatting helpers
 */
export function registerFormatHelpers(handlebars: typeof Handlebars): void {
  handlebars.registerHelper('yesNo', (value: unknown) =>
    value === true ? 'Yes' : 'No'
  );

  handlebars.registerHelper('urlencode', (value: unknown) => urlEncode(value));

  // SafeString: the value is already escaped for a markdown table cell, and
  // Handlebars' HTML escaping would turn quotes and ampersands into entities.
  // Matches formatDefault below, so both columns follow the same rules.
  handlebars.registerHelper(
    'escapeTableCell',
    (value: unknown) => new handlebars.SafeString(escapeTableCell(value))
  );

  handlebars.registerHelper(
    'formatDefault',
    (value: unknown) => new handlebars.SafeString(formatDefault(value))
  );

  handlebars.registerHelper('join', (array: unknown, separator: unknown) => {
    if (!Array.isArray(array)) return '';
    const sep = typeof separator === 'string' ? separator : ',';
    return array.join(sep);
  });
}
