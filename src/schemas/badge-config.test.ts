import { describe, it, expect } from 'vitest';
import { sectionValueSchemas } from './input-schema.js';
import { parseWithSchema } from '../utils/zod.js';

// The schema the action actually resolves badges with, inline or from a file.
const parse = (badges: unknown[]) => parseWithSchema(sectionValueSchemas.badges, badges);

describe('badgeSchema', () => {
  describe('valid badges', () => {
    it('accepts a minimal badge', () => {
      const result = parse([{ label: 'build', message: 'passing', color: 'green' }]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'build',
        message: 'passing',
        color: 'green',
      });
    });

    it('accepts a badge with an https URL', () => {
      const result = parse([
        { label: 'docs', message: 'available', color: 'blue', url: 'https://example.com/docs' },
      ]);

      expect(result[0]).toMatchObject({ url: 'https://example.com/docs' });
    });

    it('accepts hex colors', () => {
      expect(parse([{ label: 'a', message: 'b', color: '#4c1' }])[0]).toMatchObject({
        color: '#4c1',
      });
    });

    it('accepts a markdown-only badge without label, message or color', () => {
      const result = parse([{ markdown: '![Custom](https://example.com/badge.svg)' }]);

      expect(result[0]).toMatchObject({
        markdown: '![Custom](https://example.com/badge.svg)',
      });
    });

    it('accepts a bare string as markdown shorthand', () => {
      const result = parse(['![Custom](https://example.com/badge.svg)']);

      expect(result[0]).toEqual({ markdown: '![Custom](https://example.com/badge.svg)' });
    });
  });

  describe('required fields', () => {
    it.each([
      ['label', { message: 'passing', color: 'green' }],
      ['message', { label: 'build', color: 'green' }],
      ['color', { label: 'build', message: 'passing' }],
    ])('rejects an object badge missing %s', (_field, badge) => {
      expect(() => parse([badge])).toThrow(/label.*message.*color/s);
    });

    it('rejects an empty object', () => {
      expect(() => parse([{}])).toThrow();
    });
  });

  describe('URL validation', () => {
    it('rejects non-http(s) schemes', () => {
      expect(() =>
        parse([{ label: 'a', message: 'b', color: 'c', url: 'ftp://example.com' }])
      ).toThrow('http or https');
    });

    it('rejects malformed URLs', () => {
      expect(() =>
        parse([{ label: 'a', message: 'b', color: 'c', url: 'not a url' }])
      ).toThrow('Invalid URL format');
    });

    // Regression: the SSRF guard was dropped during the rewrite.
    it.each([
      'http://169.254.169.254/latest/meta-data/',
      'http://localhost:8080/badge.svg',
      'http://127.0.0.1/badge.svg',
      'http://10.0.0.1/badge.svg',
      'http://192.168.1.1/badge.svg',
      'http://172.16.0.1/badge.svg',
      'http://[::1]/badge.svg',
      'http://metadata.google.internal/computeMetadata/v1/',
    ])('rejects the private address %s', (url) => {
      expect(() => parse([{ label: 'a', message: 'b', color: 'c', url }])).toThrow(
        'private or internal'
      );
    });

    // Regression: Handlebars does not escape ) or ], so these would close the
    // markdown link early and inject arbitrary markdown after it.
    it.each([
      'https://example.com/a)](javascript:alert(1)',
      'https://example.com/a]b',
      'https://example.com/a\\b',
    ])('rejects the markdown breakout %s', (url) => {
      expect(() => parse([{ label: 'a', message: 'b', color: 'c', url }])).toThrow(
        'percent-encode'
      );
    });

    // The private-address check runs on URL.hostname, which canonicalises these
    // to 127.0.0.1. isPrivateAddress does not recognise them on its own, so the
    // guard holds only as long as it is fed a parsed hostname.
    it.each([
      'http://2130706433/badge.svg',
      'http://0177.0.0.1/badge.svg',
      'http://127.1/badge.svg',
    ])('rejects the alternative loopback encoding %s', (url) => {
      expect(() => parse([{ label: 'a', message: 'b', color: 'c', url }])).toThrow(
        'private or internal'
      );
    });
  });

  describe('label validation', () => {
    // Regression: the label is the alt text of `[![label](img)](url)`, so a `]`
    // closed it early and the rest of the value became a link destination the
    // URL rules above never saw.
    it.each([
      'a](https://evil.example) [x',
      'build [beta]',
      'a\\b',
    ])('rejects the markdown breakout %s', (label) => {
      expect(() => parse([{ label, message: 'b', color: 'green' }])).toThrow('Label cannot');
    });

    it('still accepts parentheses, which cannot close the alt text', () => {
      expect(parse([{ label: 'build (fast)', message: 'b', color: 'green' }])[0]).toMatchObject({
        label: 'build (fast)',
      });
    });
  });

  describe('color validation', () => {
    it.each(['red)](https://evil.example', 'a b', 'x<y'])(
      'rejects the unsafe color %s',
      (color) => {
        expect(() => parse([{ label: 'a', message: 'b', color }])).toThrow('name or hex code');
      }
    );
  });
});
