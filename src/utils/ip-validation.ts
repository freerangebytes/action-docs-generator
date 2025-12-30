// Hostnames that should never appear in URLs.
const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', '0.0.0.0']);

// Private IPv4 ranges. Format: [firstOctet, secondOctetMin?, secondOctetMax?]
const PRIVATE_IPV4_RANGES: [number, number?, number?][] = [
  [127],           // 127.0.0.0/8 - Loopback
  [10],            // 10.0.0.0/8 - Private
  [172, 16, 31],   // 172.16.0.0/12 - Private
  [192, 168, 168], // 192.168.0.0/16 - Private
  [169, 254, 254], // 169.254.0.0/16 - Link-local
];

// Private IPv6 prefixes
const PRIVATE_IPV6_PREFIXES = ['fc', 'fd', 'fe8', 'fe9', 'fea', 'feb'];

/**
 * Parse IPv4 address into octets, returns undefined if not a valid IPv4
 */
function parseIPv4(hostname: string): number[] | undefined {
  const parts = hostname.split('.');
  if (parts.length !== 4) return undefined;

  const octets = parts.map((p) => parseInt(p, 10));
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return undefined;

  return octets;
}

/**
 * Check if IPv4 octets match a private range
 */
function matchesIPv4Range(
  octets: number[],
  [first, secondMin, secondMax]: [number, number?, number?]
): boolean {
  if (octets[0] !== first) return false;
  if (secondMin === undefined) return true;
  const second = octets[1] ?? 0;
  return second >= secondMin && second <= (secondMax ?? secondMin);
}

/**
 * Check if a hostname is an IPv4 address in a private/reserved range
 */
function isPrivateIPv4(hostname: string): boolean {
  const octets = parseIPv4(hostname);
  if (!octets) return false;
  return PRIVATE_IPV4_RANGES.some((range) => matchesIPv4Range(octets, range));
}

/**
 * Check if a hostname is an IPv6 address in a private/reserved range
 */
function isPrivateIPv6(hostname: string): boolean {
  const addr = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  if (!addr.includes(':')) return false;

  const lowerAddr = addr.toLowerCase();

  // ::1 is loopback, :: is unspecified address
  if (lowerAddr === '::1' || lowerAddr === '::') return true;

  // Prefix matches
  if (PRIVATE_IPV6_PREFIXES.some((p) => lowerAddr.startsWith(p))) return true;

  // IPv4-mapped IPv6 in dotted decimal format (::ffff:192.168.1.1)
  const ipv4DottedMatch = lowerAddr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4DottedMatch?.[1]) return isPrivateIPv4(ipv4DottedMatch[1]);

  // IPv4-mapped IPv6 in hex format (::ffff:c0a8:101)
  const ipv4HexMatch = lowerAddr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (ipv4HexMatch?.[1] && ipv4HexMatch[2]) {
    const high = parseInt(ipv4HexMatch[1], 16);
    const low = parseInt(ipv4HexMatch[2], 16);
    const ipv4 = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    return isPrivateIPv4(ipv4);
  }

  return false;
}

/**
 * Check if hostname is a private/internal address
 */
export function isPrivateAddress(hostname: string): boolean {
  return BLOCKED_HOSTS.has(hostname) || isPrivateIPv4(hostname) || isPrivateIPv6(hostname);
}
