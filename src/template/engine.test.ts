import { describe, it, expect, vi } from 'vitest';
import { parse } from 'yaml';

vi.mock('@actions/github', () => ({
  context: { repo: { owner: 'owner', repo: 'repo' } },
}));

const { renderTemplate } = await import('./engine.js');
const { TemplateError } = await import('../utils/errors.js');

type Metadata = Parameters<typeof renderTemplate>[0];
type Config = Parameters<typeof renderTemplate>[1];

const metadata = (overrides: Partial<Metadata> = {}): Metadata => ({
  name: 'Test Action',
  description: 'A test action',
  runs: { using: 'node24' },
  inputs: [],
  outputs: [],
  ...overrides,
});

const config = (overrides: Partial<Config> = {}): Config =>
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
  }) as Config;

/** Pull the fenced yaml block that follows a heading. */
const yamlBlockAfter = (content: string, heading: string): string => {
  const section = content.slice(content.indexOf(heading));
  const match = /```yaml\n([\s\S]*?)```/.exec(section);
  return match?.[1] ?? '';
};

describe('renderTemplate', () => {
  describe('section selection', () => {
    it('includes every section by default', () => {
      const result = renderTemplate(metadata(), config());

      expect(result.sectionsGenerated).toContain('title');
      expect(result.sectionsGenerated).toContain('license');
      expect(result.content).toContain('# Test Action');
    });

    it('honours includeSections exclusively', () => {
      const result = renderTemplate(metadata(), config({ includeSections: ['title', 'usage'] }));

      expect(result.sectionsGenerated).toEqual(['title', 'usage']);
      expect(result.content).toContain('# Test Action');
      expect(result.content).not.toContain('## License');
    });

    it('honours excludeSections', () => {
      const result = renderTemplate(metadata(), config({ excludeSections: ['license'] }));

      expect(result.sectionsGenerated).not.toContain('license');
      expect(result.content).not.toContain('## License');
      expect(result.content).toContain('# Test Action');
    });
  });

  describe('usage snippet', () => {
    it('lists required inputs and those with a meaningful default', () => {
      const content = renderTemplate(
        metadata({
          inputs: [
            { id: 'token', description: 'A token', required: true, default: undefined },
            { id: 'level', description: 'A level', required: false, default: 'info' },
            { id: 'unset', description: 'Skipped', required: false, default: '' },
          ],
        }),
        config()
      ).content;

      const usage = yamlBlockAfter(content, '## Usage');
      expect(usage).toContain('token: # required');
      expect(usage).toContain('level: info');
      expect(usage).not.toContain('unset:');
    });

    it('omits the with block when no input needs one', () => {
      const usage = yamlBlockAfter(renderTemplate(metadata(), config()).content, '## Usage');

      expect(usage.trim()).toBe('- uses: owner/repo@v1');
    });

    // Regression: multi-line defaults were concatenated inline, producing YAML
    // that did not parse.
    it('emits parseable YAML for a multi-line default', () => {
      const content = renderTemplate(
        metadata({
          inputs: [
            {
              id: 'config',
              description: 'A config',
              required: false,
              default: '[\n  {"a": 1}\n]',
            },
          ],
        }),
        config()
      ).content;

      const parsed = parse(yamlBlockAfter(content, '## Usage')) as [{ with: { config: string } }];
      expect(JSON.parse(parsed[0].with.config)).toEqual([{ a: 1 }]);
    });
  });

  describe('examples', () => {
    it('renders configured examples as workflow steps', () => {
      const content = renderTemplate(
        metadata(),
        config({
          examples: {
            value: [
              {
                title: 'Custom Path',
                description: 'Writes elsewhere',
                name: 'Generate',
                with: { 'output-path': './docs/README.md' },
              },
            ],
          },
        })
      ).content;

      expect(content).toContain('### Custom Path');
      const parsed = parse(yamlBlockAfter(content, '### Custom Path')) as [
        { name: string; uses: string; with: Record<string, string> },
      ];
      expect(parsed[0]).toEqual({
        name: 'Generate',
        uses: 'owner/repo@v1',
        with: { 'output-path': './docs/README.md' },
      });
    });

    it('uses a per-example version over the resolved one', () => {
      const content = renderTemplate(
        metadata(),
        config({
          version: 'v1',
          examples: {
            value: [{ title: 'Pinned', description: 'Pinned version', version: 'v9.9.9' }],
          },
        })
      ).content;

      expect(yamlBlockAfter(content, '### Pinned')).toContain('owner/repo@v9.9.9');
    });

    it('treats the example shorthand as a pre-rendered snippet and wins over examples', () => {
      const content = renderTemplate(
        metadata(),
        config({
          example: '- uses: owner/repo@v1\n  with:\n    hand: written',
          examples: { value: [{ title: 'Ignored', description: 'Should not render' }] },
        })
      ).content;

      expect(content).toContain('hand: written');
      expect(content).not.toContain('Ignored');
    });
  });

  describe('custom templates', () => {
    it('renders a custom template with the context', () => {
      const result = renderTemplate(
        metadata(),
        config({ template: { value: 'Name: {{name}} / Version: {{version}}' } })
      );

      expect(result.content).toBe('Name: Test Action / Version: v1');
    });

    it('exposes repositoryUrl lazily to templates that ask for it', () => {
      const result = renderTemplate(
        metadata(),
        config({ template: { value: '{{repositoryUrl}}' } })
      );

      expect(result.content).toBe('https://github.com/owner/repo');
    });

    it('prefers an explicit repositoryUrl', () => {
      const result = renderTemplate(
        metadata(),
        config({
          repositoryUrl: 'https://example.com/x',
          template: { value: '{{repositoryUrl}}' },
        })
      );

      expect(result.content).toBe('https://example.com/x');
    });

    // Regression: the rewrite dropped the try/catch, so a malformed template
    // surfaced a raw Handlebars error.
    it('wraps a malformed template in a TemplateError naming the source', () => {
      expect(() =>
        renderTemplate(metadata(), config({ template: { value: '{{#if unclosed}}' } }))
      ).toThrow(TemplateError);

      expect(() =>
        renderTemplate(
          metadata(),
          config({ template: { value: '{{#if x}}', path: 'tpl.hbs' } })
        )
      ).toThrow(/tpl\.hbs/);
    });
  });

  describe('header level', () => {
    it('offsets headings by the configured base level', () => {
      const content = renderTemplate(metadata(), config({ headerLevel: 2 })).content;

      expect(content).toContain('## Test Action');
      expect(content).toContain('### Usage');
    });
  });

  describe('tables', () => {
    // Regression: escapeTableCell returned a plain string, so Handlebars
    // HTML-escaped it a second time and quotes became &quot;.
    it('does not HTML-escape quotes or ampersands in descriptions', () => {
      const content = renderTemplate(
        metadata({
          inputs: [
            {
              id: 'perms',
              description: 'e.g. {"contents": "read"} & more',
              required: false,
              default: undefined,
            },
          ],
        }),
        config()
      ).content;

      expect(content).toContain('{"contents": "read"} & more');
      expect(content).not.toContain('&quot;');
      expect(content).not.toContain('&amp;');
    });

    it('escapes pipes and flattens newlines so the table survives', () => {
      const content = renderTemplate(
        metadata({
          inputs: [
            { id: 'x', description: 'a | b\nsecond line', required: false, default: undefined },
          ],
        }),
        config()
      ).content;

      const row = content.split('\n').find((l) => l.startsWith('| `x`'));
      expect(row).toBe('| `x` | a \\| b second line | No | - |');
    });

    it('escapes raw HTML in descriptions', () => {
      const content = renderTemplate(
        metadata({
          inputs: [
            { id: 'x', description: '<script>alert(1)</script>', required: false, default: undefined },
          ],
        }),
        config()
      ).content;

      expect(content).not.toContain('<script>');
      expect(content).toContain('&lt;script&gt;');
    });

    it('renders a default containing a backtick without breaking the code span', () => {
      const content = renderTemplate(
        metadata({
          inputs: [{ id: 'x', description: 'd', required: false, default: 'a`b' }],
        }),
        config()
      ).content;

      const row = content.split('\n').find((l) => l.startsWith('| `x`'));
      expect(row).toContain('`` a`b ``');
    });
  });

  describe('permissions', () => {
    it('renders the permissions map', () => {
      const content = renderTemplate(
        metadata(),
        config({ permissions: { value: { contents: 'read', issues: 'write' } } })
      ).content;

      const block = yamlBlockAfter(content, '## Permissions');
      expect(parse(block)).toEqual({ permissions: { contents: 'read', issues: 'write' } });
    });

    it('omits the section when no permissions are configured', () => {
      expect(renderTemplate(metadata(), config()).content).not.toContain('## Permissions');
    });
  });

  describe('generated date', () => {
    it('is omitted by default', () => {
      expect(renderTemplate(metadata(), config()).content).not.toMatch(/ on \d{4}-/);
    });

    it('is included when requested', () => {
      const content = renderTemplate(metadata(), config({ includeGeneratedDate: true })).content;
      expect(content).toMatch(/ on \d{4}-\d{2}-\d{2}T/);
    });
  });
});
