import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@actions/github', () => ({
  getOctokit: () => ({ rest: { repos: { listTags: () => ({ data: [] }) } } }),
  context: { repo: { owner: 'owner', repo: 'repo' } },
}));

const { loadInput } = await import('./main.js');
const { ConfigError, ValidationError } = await import('./utils/errors.js');

/** @actions/core reads inputs from INPUT_<NAME> with spaces as underscores. */
const setInputs = (inputs: Record<string, string>): void => {
  for (const [name, value] of Object.entries(inputs)) {
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
  }
};

const REQUIRED = {
  'action-path': './action.yaml',
  'output-path': './README.md',
  license: 'MIT',
  'header-level': '1',
  version: 'v1',
};

describe('loadInput', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = Object.fromEntries(
      Object.entries(original).filter(([key]) => !key.startsWith('INPUT_'))
    );
    setInputs(REQUIRED);
  });

  afterEach(() => {
    process.env = { ...original };
  });

  describe('comma-separated lists', () => {
    it('parses and trims a list', async () => {
      setInputs({ 'include-sections': 'title, inputs ,usage' });

      expect((await loadInput()).includeSections).toEqual(['title', 'inputs', 'usage']);
    });

    it('treats an empty string as an empty list', async () => {
      setInputs({ 'include-sections': '   ' });

      expect((await loadInput()).includeSections).toEqual([]);
    });

    it('drops blank entries left by a trailing comma', async () => {
      setInputs({ 'include-sections': 'title,inputs,' });

      expect((await loadInput()).includeSections).toEqual(['title', 'inputs']);
    });

    it('rejects an unknown section name', async () => {
      setInputs({ 'include-sections': 'title,not-a-section' });

      await expect(loadInput()).rejects.toThrow(ValidationError);
    });
  });

  describe('boolean inputs', () => {
    it('defaults to false when unset', async () => {
      expect((await loadInput()).includeGeneratedDate).toBe(false);
    });

    it.each([
      ['true', true],
      ['True', true],
      ['false', false],
    ])('parses %s', async (raw, expected) => {
      setInputs({ 'include-generated-date': raw });

      expect((await loadInput()).includeGeneratedDate).toBe(expected);
    });

    it('rejects a non-boolean value rather than silently coercing', async () => {
      setInputs({ 'include-generated-date': 'yes please' });

      await expect(loadInput()).rejects.toThrow();
    });
  });

  describe('JSON inputs', () => {
    it('parses an inline JSON object', async () => {
      setInputs({ permissions: '{"contents": "read"}' });

      expect((await loadInput()).permissions.content).toEqual({ contents: 'read' });
    });

    it('reports invalid JSON with the input name', async () => {
      setInputs({ permissions: '{not json' });

      const promise = loadInput();
      await expect(promise).rejects.toThrow(ConfigError);
      await expect(promise).rejects.toThrow('permissions');
    });
  });

  describe('header-level', () => {
    it.each(['0', '4'])('rejects %s as out of range', async (raw) => {
      setInputs({ 'header-level': raw });

      await expect(loadInput()).rejects.toThrow(ValidationError);
    });

    // Caught before the schema sees it, so the message names the input rather
    // than reporting "expected number, received NaN".
    it.each(['abc', '', '  '])('reports %s as not a number', async (raw) => {
      setInputs({ 'header-level': raw });

      await expect(loadInput()).rejects.toThrow(/'header-level' must be a number/);
    });

    it('accepts a value in range', async () => {
      setInputs({ 'header-level': '3' });

      expect((await loadInput()).headerLevel).toBe(3);
    });
  });

  describe('cross-field rules', () => {
    it('rejects inline content together with a path for the same section', async () => {
      setInputs({ description: 'Inline text', 'description-path': './d.md' });

      await expect(loadInput()).rejects.toThrow(/inline content or a path/);
    });

    it('rejects include-sections together with exclude-sections', async () => {
      setInputs({ 'include-sections': 'title', 'exclude-sections': 'license' });

      await expect(loadInput()).rejects.toThrow(/both include-sections and exclude-sections/);
    });

    it('rejects load-license-file-content without license-path', async () => {
      setInputs({ 'load-license-file-content': 'true' });

      await expect(loadInput()).rejects.toThrow(/license-path is required/);
    });

    it('rejects the example shorthand together with inline examples', async () => {
      setInputs({
        example: '- uses: owner/repo@v1 with a long enough body',
        examples: '[{"title":"T","description":"A description long enough"}]',
      });

      await expect(loadInput()).rejects.toThrow(/both example and examples/);
    });

    it('rejects the example shorthand together with examples-path', async () => {
      setInputs({
        example: '- uses: owner/repo@v1 with a long enough body',
        'examples-path': './examples.yaml',
      });

      await expect(loadInput()).rejects.toThrow(/both example and examples/);
    });
  });
});
