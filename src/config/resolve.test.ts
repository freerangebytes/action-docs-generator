import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

vi.mock('@actions/github', () => ({
  getOctokit: () => ({ rest: { repos: { listTags: () => ({ data: [] }) } } }),
  context: { repo: { owner: 'owner', repo: 'repo' } },
}));

const { resolveConfig } = await import('./resolve.js');
const { ConfigError } = await import('../utils/errors.js');

type Input = Parameters<typeof resolveConfig>[0];

const TEST_DIR = join(process.cwd(), 'test-fixtures-resolve');
const REL = 'test-fixtures-resolve';

const input = (overrides: Partial<Input> = {}): Input =>
  ({
    actionPath: './action.yaml',
    outputPath: './README.md',
    description: {},
    contributing: {},
    template: {},
    badges: {},
    permissions: {},
    examples: {},
    license: 'MIT',
    loadLicenseFileContent: false,
    includeSections: [],
    excludeSections: [],
    headerLevel: 1,
    includeGeneratedDate: false,
    version: 'v1',
    ...overrides,
  }) as Input;

const fixture = async (name: string, content: string): Promise<string> => {
  await writeFile(join(TEST_DIR, name), content);
  return `${REL}/${name}`;
};

describe('resolveConfig', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('inline vs path', () => {
    it('uses inline content when present', async () => {
      const config = await resolveConfig(input({ description: { content: 'Inline text' } }));

      expect(config.description).toEqual({ value: 'Inline text' });
    });

    it('reads from a path and keeps the path for link rendering', async () => {
      const path = await fixture('desc.md', 'From a file');

      const config = await resolveConfig(input({ description: { path } }));

      expect(config.description).toEqual({ value: 'From a file', path });
    });

    it('leaves an unset section empty', async () => {
      expect((await resolveConfig(input())).description).toEqual({});
    });

    it('reports a missing file with its path', async () => {
      const promise = resolveConfig(input({ description: { path: `${REL}/nope.md` } }));

      await expect(promise).rejects.toThrow(ConfigError);
      await expect(promise).rejects.toThrow('nope.md');
    });
  });

  // Regression: resolve.ts passed a bare z.string() for file-loaded content, so
  // every length and shape constraint applied only to the inline branch.
  describe('path inputs are held to the same schema as inline content', () => {
    it('rejects a description file below the minimum length', async () => {
      const path = await fixture('short.md', 'ab');

      await expect(resolveConfig(input({ description: { path } }))).rejects.toThrow(ConfigError);
    });

    it('rejects a template file over the maximum length', async () => {
      const path = await fixture('big.hbs', 'x'.repeat(100_001));

      await expect(resolveConfig(input({ template: { path } }))).rejects.toThrow(ConfigError);
    });

    it('rejects a badges file with more than the maximum badges', async () => {
      const badges = Array.from({ length: 21 }, (_, i) => ({
        label: `l${i.toString()}`,
        message: 'm',
        color: 'green',
      }));
      const path = await fixture('badges.json', JSON.stringify({ badges }));

      await expect(resolveConfig(input({ badges: { path } }))).rejects.toThrow(ConfigError);
    });

    it('accepts a badges file within the limit', async () => {
      const path = await fixture(
        'ok-badges.yaml',
        'badges:\n  - label: build\n    message: passing\n    color: green\n'
      );

      const config = await resolveConfig(input({ badges: { path } }));

      expect(config.badges.value).toHaveLength(1);
    });

    it('rejects a badge file whose URL points at a private address', async () => {
      const path = await fixture(
        'ssrf.yaml',
        'badges:\n  - label: a\n    message: b\n    color: green\n    url: http://169.254.169.254/\n'
      );

      await expect(resolveConfig(input({ badges: { path } }))).rejects.toThrow(ConfigError);
    });
  });

  describe('structured files', () => {
    it('accepts JSON as well as YAML', async () => {
      const path = await fixture('perms.json', JSON.stringify({ contents: 'read' }));

      expect((await resolveConfig(input({ permissions: { path } }))).permissions.value).toEqual({
        contents: 'read',
      });
    });

    it('accepts content wrapped under the section key', async () => {
      const path = await fixture('wrapped.yaml', 'permissions:\n  contents: read\n');

      expect((await resolveConfig(input({ permissions: { path } }))).permissions.value).toEqual({
        contents: 'read',
      });
    });

    it('reports a YAML parse failure with the path', async () => {
      const path = await fixture('bad.yaml', '{ invalid ::');

      await expect(resolveConfig(input({ permissions: { path } }))).rejects.toThrow('bad.yaml');
    });
  });

  describe('license content', () => {
    it('is left unset unless explicitly requested', async () => {
      const licensePath = await fixture('LICENSE', 'MIT text');

      expect((await resolveConfig(input({ licensePath }))).licenseContent).toBeUndefined();
    });

    it('is inlined when requested', async () => {
      const licensePath = await fixture('LICENSE', '  MIT text\n');

      const config = await resolveConfig(
        input({ licensePath, loadLicenseFileContent: true })
      );

      expect(config.licenseContent).toBe('MIT text');
    });
  });

  describe('version', () => {
    it('keeps an explicit version without consulting the API', async () => {
      expect((await resolveConfig(input({ version: 'v2.3.4' }))).version).toBe('v2.3.4');
    });

    it('falls back to main when detection finds nothing', async () => {
      expect((await resolveConfig(input({ version: undefined, githubToken: 't' }))).version).toBe(
        'main'
      );
    });
  });
});
