import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { renderYamlValue, renderYamlEntry } from './yaml.js';

describe('renderYamlValue', () => {
  it('leaves a plain scalar untouched', () => {
    expect(renderYamlValue('./action.yaml', 6)).toBe('./action.yaml');
  });

  it('leaves a GitHub Actions expression untouched', () => {
    expect(renderYamlValue('${{ github.token }}', 6)).toBe('${{ github.token }}');
  });

  // GitHub Actions inputs are strings regardless, so quoting these would add
  // noise and make generated snippets differ from what an author would write.
  it.each(['1', '3.5', 'true', 'false', 'null'])('leaves the ambiguous scalar %s unquoted', (v) => {
    expect(renderYamlValue(v, 6)).toBe(v);
  });

  it.each([
    ['has: a colon', '"has: a colon"'],
    ['#starts-with-hash', '"#starts-with-hash"'],
    ['- looks like a list', '"- looks like a list"'],
    ['trailing space ', '"trailing space "'],
    ['', '""'],
  ])('quotes %s', (input, expected) => {
    expect(renderYamlValue(input, 6)).toBe(expected);
  });

  it('uses a literal block for multi-line values and indents continuations', () => {
    expect(renderYamlValue('a\nb', 6)).toBe('|-\n      a\n      b');
  });

  it('normalizes CRLF so blocks carry no carriage returns', () => {
    expect(renderYamlValue('a\r\nb', 4)).not.toContain('\r');
  });
});

describe('renderYamlEntry', () => {
  it('indents the key and the block body consistently', () => {
    expect(renderYamlEntry('key', 'a\nb', 4)).toBe('    key: |-\n      a\n      b');
  });

  // Regression: values were concatenated as `${key}: ${value}`, so a multi-line
  // value produced YAML that did not parse.
  it('round-trips a multi-line JSON value through a YAML parser', () => {
    const value = '[\n  {"label": "build"},\n  {"label": "cov"}\n]';
    const block = ['- uses: owner/repo@v1', '  with:', renderYamlEntry('badges', value, 4)].join(
      '\n'
    );

    const parsed = parse(block) as [{ with: { badges: string } }];
    expect(JSON.parse(parsed[0].with.badges)).toEqual([{ label: 'build' }, { label: 'cov' }]);
  });

  it('round-trips a value containing a colon', () => {
    const block = `key:\n${renderYamlEntry('note', 'see: this', 2)}`;
    expect(parse(block)).toEqual({ key: { note: 'see: this' } });
  });
});
