import { describe, it, expect } from 'vitest';
import { validateBadges } from './badges.js';

describe('validateBadges', () => {
  describe('valid badges', () => {
    it('accepts minimal valid badge', () => {
      const result = validateBadges([
        { label: 'build', message: 'passing', color: 'green' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        label: 'build',
        message: 'passing',
        color: 'green',
        url: undefined,
        markdown: undefined,
      });
    });

    it('accepts badge with valid https URL', () => {
      const result = validateBadges([
        {
          label: 'docs',
          message: 'available',
          color: 'blue',
          url: 'https://example.com/docs',
        },
      ]);

      expect(result[0]?.url).toBe('https://example.com/docs');
    });

    it('accepts badge with custom markdown', () => {
      const result = validateBadges([
        {
          label: 'custom',
          message: 'badge',
          color: 'purple',
          markdown: '![Custom](https://example.com/badge.svg)',
        },
      ]);

      expect(result[0]?.markdown).toBe('![Custom](https://example.com/badge.svg)');
    });
  });

  describe('required fields', () => {
    it('rejects badge without label', () => {
      expect(() =>
        validateBadges([{ message: 'passing', color: 'green' }])
      ).toThrow('0.label');
    });

    it('rejects badge without message', () => {
      expect(() =>
        validateBadges([{ label: 'build', color: 'green' }])
      ).toThrow('0.message');
    });

    it('rejects badge without color', () => {
      expect(() =>
        validateBadges([{ label: 'build', message: 'passing' }])
      ).toThrow('0.color');
    });

    it('rejects non-object badge', () => {
      expect(() => validateBadges(['not an object'])).toThrow('expected object');
    });
  });

  describe('URL validation', () => {
    it('rejects non-http(s) URLs', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'ftp://example.com' },
        ])
      ).toThrow('URL must use http or https protocol');
    });

    it('rejects invalid URLs', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'not a url' },
        ])
      ).toThrow('Invalid URL format');
    });
  });

  describe('private address blocking', () => {
    it('rejects localhost', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://localhost/path' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects 127.x.x.x loopback', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://127.0.0.1/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects 10.x.x.x private range', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://10.0.0.1/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects 172.16-31.x.x private range', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://172.16.0.1/' },
        ])
      ).toThrow('cannot reference private or internal addresses');

      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://172.31.255.255/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('allows 172.15.x.x (not in private range)', () => {
      const result = validateBadges([
        { label: 'a', message: 'b', color: 'c', url: 'http://172.15.0.1/' },
      ]);
      expect(result[0]?.url).toBe('http://172.15.0.1/');
    });

    it('rejects 192.168.x.x private range', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://192.168.1.1/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects 169.254.x.x link-local', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://169.254.1.1/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects IPv6 loopback ::1', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://[::1]/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects IPv6 unique local (fc00::/fd00::)', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://[fc00::1]/' },
        ])
      ).toThrow('cannot reference private or internal addresses');

      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://[fd12::1]/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects IPv6 link-local (fe80::)', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://[fe80::1]/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });

    it('rejects IPv4-mapped IPv6 with private IPv4', () => {
      expect(() =>
        validateBadges([
          { label: 'a', message: 'b', color: 'c', url: 'http://[::ffff:192.168.1.1]/' },
        ])
      ).toThrow('cannot reference private or internal addresses');
    });
  });
});
