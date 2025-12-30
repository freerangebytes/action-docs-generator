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
 * Accepts unknown because Handlebars may pass unexpected types.
 */
export function escapeTableCell(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
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

  handlebars.registerHelper('escapeTableCell', (value: unknown) => escapeTableCell(value));

  handlebars.registerHelper('formatDefault', function (value: unknown) {
    if (typeof value !== 'string' || value === '') {
      return new handlebars.SafeString('-');
    }
    const escaped = value.replace(/\|/g, '\\|');
    return new handlebars.SafeString(`\`${escaped}\``);
  });

  handlebars.registerHelper('join', (array: unknown, separator: unknown) => {
    if (!Array.isArray(array)) return '';
    const sep = typeof separator === 'string' ? separator : ',';
    return array.join(sep);
  });
}
