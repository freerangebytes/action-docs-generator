import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const listTags = vi.fn();

vi.mock('@actions/github', () => ({
  getOctokit: () => ({ rest: { repos: { listTags } } }),
  context: { repo: { owner: 'owner', repo: 'repo' } },
}));

const { detectVersion } = await import('./version.js');

const tags = (...names: string[]) => ({ data: names.map((name) => ({ name })) });

describe('detectVersion', () => {
  beforeEach(() => {
    listTags.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to main without a token, without calling the API', async () => {
    expect(await detectVersion(undefined)).toBe('main');
    expect(listTags).not.toHaveBeenCalled();
  });

  it('falls back to main when the repository has no tags', async () => {
    listTags.mockResolvedValue(tags());
    expect(await detectVersion('t')).toBe('main');
  });

  it('falls back to main when no tag looks like a version', async () => {
    listTags.mockResolvedValue(tags('latest', 'nightly'));
    expect(await detectVersion('t')).toBe('main');
  });

  it('falls back to main when the API call fails', async () => {
    listTags.mockRejectedValue(new Error('boom'));
    expect(await detectVersion('t')).toBe('main');
  });

  it('picks the highest version regardless of API ordering', async () => {
    listTags.mockResolvedValue(tags('v1.0.0', 'v2.3.1', 'v2.10.0', 'v0.9.9'));
    expect(await detectVersion('t')).toBe('v2.10.0');
  });

  it('compares segments numerically, not lexically', async () => {
    listTags.mockResolvedValue(tags('v1.9.0', 'v1.10.0'));
    expect(await detectVersion('t')).toBe('v1.10.0');
  });

  it('ignores tags that are not semver-like', async () => {
    listTags.mockResolvedValue(tags('v1.0.0', 'v2.0.0-beta', 'release-3'));
    expect(await detectVersion('t')).toBe('v1.0.0');
  });

  // Regression: v1 and v1.0.0 compared equal, so the winner depended on the
  // order the GitHub API happened to return.
  describe('deterministic tie-breaking', () => {
    it('prefers the fully-qualified tag over its shorter major equal', async () => {
      listTags.mockResolvedValue(tags('v1.0.0', 'v1'));
      expect(await detectVersion('t')).toBe('v1.0.0');
    });

    it('returns the same result when the API order is reversed', async () => {
      listTags.mockResolvedValue(tags('v1', 'v1.0.0'));
      expect(await detectVersion('t')).toBe('v1.0.0');
    });

    it('is stable for tags differing only by the v prefix', async () => {
      listTags.mockResolvedValue(tags('1.2.3', 'v1.2.3'));
      const first = await detectVersion('t');
      listTags.mockResolvedValue(tags('v1.2.3', '1.2.3'));
      expect(await detectVersion('t')).toBe(first);
    });
  });
});
