import { describe, it, expect } from 'vitest';
import { isPrivateAddress } from './ip-validation.js';

describe('isPrivateAddress', () => {
  describe('blocked hostnames', () => {
    it('blocks localhost', () => {
      expect(isPrivateAddress('localhost')).toBe(true);
    });

    it('blocks localhost.localdomain', () => {
      expect(isPrivateAddress('localhost.localdomain')).toBe(true);
    });

    it('blocks 0.0.0.0', () => {
      expect(isPrivateAddress('0.0.0.0')).toBe(true);
    });
  });

  describe('private IPv4 ranges', () => {
    it('blocks 127.x.x.x loopback', () => {
      expect(isPrivateAddress('127.0.0.1')).toBe(true);
      expect(isPrivateAddress('127.255.255.255')).toBe(true);
    });

    it('blocks 10.x.x.x private range', () => {
      expect(isPrivateAddress('10.0.0.1')).toBe(true);
      expect(isPrivateAddress('10.255.255.255')).toBe(true);
    });

    it('blocks 172.16-31.x.x private range', () => {
      expect(isPrivateAddress('172.16.0.1')).toBe(true);
      expect(isPrivateAddress('172.31.255.255')).toBe(true);
    });

    it('allows 172.15.x.x (not in private range)', () => {
      expect(isPrivateAddress('172.15.0.1')).toBe(false);
    });

    it('allows 172.32.x.x (not in private range)', () => {
      expect(isPrivateAddress('172.32.0.1')).toBe(false);
    });

    it('blocks 192.168.x.x private range', () => {
      expect(isPrivateAddress('192.168.0.1')).toBe(true);
      expect(isPrivateAddress('192.168.255.255')).toBe(true);
    });

    it('blocks 169.254.x.x link-local range', () => {
      expect(isPrivateAddress('169.254.0.1')).toBe(true);
      expect(isPrivateAddress('169.254.255.255')).toBe(true);
    });
  });

  describe('public IPv4 addresses', () => {
    it('allows public IP addresses', () => {
      expect(isPrivateAddress('8.8.8.8')).toBe(false);
      expect(isPrivateAddress('1.1.1.1')).toBe(false);
      expect(isPrivateAddress('192.169.0.1')).toBe(false);
    });
  });

  describe('private IPv6 ranges', () => {
    it('blocks ::1 loopback', () => {
      expect(isPrivateAddress('::1')).toBe(true);
      expect(isPrivateAddress('[::1]')).toBe(true);
    });

    it('blocks :: unspecified', () => {
      expect(isPrivateAddress('::')).toBe(true);
    });

    it('blocks fc00::/7 unique local addresses', () => {
      expect(isPrivateAddress('fc00::1')).toBe(true);
      expect(isPrivateAddress('fd00::1')).toBe(true);
      expect(isPrivateAddress('fdff::1')).toBe(true);
    });

    it('blocks fe80::/10 link-local addresses', () => {
      expect(isPrivateAddress('fe80::1')).toBe(true);
      expect(isPrivateAddress('fe90::1')).toBe(true);
      expect(isPrivateAddress('fea0::1')).toBe(true);
      expect(isPrivateAddress('feb0::1')).toBe(true);
    });
  });

  describe('IPv4-mapped IPv6 addresses', () => {
    it('blocks IPv4-mapped private addresses (dotted decimal)', () => {
      expect(isPrivateAddress('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateAddress('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true);
    });

    it('allows IPv4-mapped public addresses (dotted decimal)', () => {
      expect(isPrivateAddress('::ffff:8.8.8.8')).toBe(false);
    });

    it('blocks IPv4-mapped private addresses (hex format)', () => {
      // ::ffff:c0a8:101 = ::ffff:192.168.1.1
      expect(isPrivateAddress('::ffff:c0a8:101')).toBe(true);
    });
  });

  describe('public IPv6 addresses', () => {
    it('allows public IPv6 addresses', () => {
      expect(isPrivateAddress('2001:4860:4860::8888')).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('returns false for non-IP hostnames', () => {
      expect(isPrivateAddress('example.com')).toBe(false);
      expect(isPrivateAddress('github.com')).toBe(false);
    });

    it('returns false for invalid IPv4', () => {
      expect(isPrivateAddress('999.999.999.999')).toBe(false);
      expect(isPrivateAddress('1.2.3')).toBe(false);
    });
  });
});
