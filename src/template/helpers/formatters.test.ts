import { describe, it, expect } from 'vitest';
import { urlEncode, escapeTableCell, extractNodeVersion, formatDefault } from './formatters.js';

describe('urlEncode', () => {
  it('applies the shields.io doubling convention', () => {
    expect(urlEncode('a-b_c')).toBe('a--b__c');
  });

  it('percent-encodes reserved characters', () => {
    expect(urlEncode('a b/c')).toBe('a%20b%2Fc');
  });

  it('returns empty for non-strings', () => {
    expect(urlEncode(undefined)).toBe('');
    expect(urlEncode(42)).toBe('');
  });
});

describe('escapeTableCell', () => {
  it('escapes pipes so the table survives', () => {
    expect(escapeTableCell('a | b')).toBe('a \\| b');
  });

  it('flattens newlines, including CRLF', () => {
    expect(escapeTableCell('a\nb')).toBe('a b');
    expect(escapeTableCell('a\r\nb')).toBe('a b');
  });

  // The result is handed to Handlebars as a SafeString, so angle brackets must
  // be neutralised here or the documented action.yaml could inject raw HTML.
  it('escapes angle brackets', () => {
    expect(escapeTableCell('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;');
  });

  // Handlebars used to turn these into entities, which is noise in markdown and
  // breaks code spans.
  it('leaves quotes, ampersands and backticks alone', () => {
    expect(escapeTableCell('"a" & \'b\' `c`')).toBe('"a" & \'b\' `c`');
  });

  it('returns empty for non-strings', () => {
    expect(escapeTableCell(null)).toBe('');
  });
});

describe('formatDefault', () => {
  it('renders a dash when there is no default', () => {
    expect(formatDefault('')).toBe('-');
    expect(formatDefault(undefined)).toBe('-');
  });

  it('wraps a plain value in a single backtick', () => {
    expect(formatDefault('./action.yaml')).toBe('`./action.yaml`');
  });

  it('escapes pipes and flattens newlines', () => {
    expect(formatDefault('a | b\nc')).toBe('`a \\| b c`');
  });

  // Regression: the fence was always `` when the value held any backtick, so a
  // value containing exactly two closed the span early and everything after it
  // rendered as live markdown.
  it.each([
    ['a`b', '`` a`b ``'],
    ['a``b [x](y)', '``` a``b [x](y) ```'],
    ['a```b', '```` a```b ````'],
  ])('fences %s longer than its longest backtick run', (value, expected) => {
    expect(formatDefault(value)).toBe(expected);
  });
});

describe('extractNodeVersion', () => {
  it.each([
    ['node24', '24'],
    ['node20', '20'],
    ['docker', ''],
    ['composite', ''],
  ])('maps %s to %s', (using, expected) => {
    expect(extractNodeVersion(using)).toBe(expected);
  });

  it('returns empty for non-strings', () => {
    expect(extractNodeVersion(undefined)).toBe('');
  });
});
