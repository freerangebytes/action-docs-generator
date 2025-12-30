import * as github from '@actions/github';
import { debug, warning } from './logger.js';

// Pattern for semver-like tags (v1, v1.0, v1.0.0, etc.).
// Allows 1-3 numeric segments with optional 'v' prefix.
const SEMVER_PATTERN = /^v?\d+(\.\d+)?(\.\d+)?$/;

/**
 * Parse a version string into numeric parts for comparison.
 * Expects a pure numeric version (e.g., "v1.0.0", "1.2.3") without pre-release suffixes.
 */
function parseVersion(version: string): number[] {
  return version.replace(/^v/, '').split('.').map(Number);
}

/**
 * Compare two version strings (descending order)
 * Returns negative if a > b, positive if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) return bVal - aVal;
  }
  return 0;
}

/**
 * Filter and sort tags to find semver-like versions
 */
function findLatestSemverTag(tagNames: string[]): string | undefined {
  const semverTags = tagNames.filter((name) => SEMVER_PATTERN.test(name));

  if (semverTags.length === 0) {
    return undefined;
  }

  return semverTags.sort(compareVersions)[0];
}

/**
 * Fetch tags from GitHub repository using the API
 */
async function fetchTags(token: string, owner: string, repo: string): Promise<string[]> {
  const octokit = github.getOctokit(token);

  const { data: tags } = await octokit.rest.repos.listTags({
    owner,
    repo,
    per_page: 100,
  });

  return tags.map((tag) => tag.name);
}

/**
 * Detect the latest version tag from GitHub repository.
 * Returns the latest semver-like tag or 'main' as fallback.
 */
export async function detectVersion(): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    debug('No GITHUB_TOKEN available, using default version');
    return 'main';
  }

  const { owner, repo } = github.context.repo;
  if (!owner || !repo) {
    debug('Could not determine repository, using default version');
    return 'main';
  }

  try {
    const tagNames = await fetchTags(token, owner, repo);

    if (tagNames.length === 0) {
      debug('No tags found, using default version');
      return 'main';
    }

    const latestSemver = findLatestSemverTag(tagNames);
    if (latestSemver) {
      debug(`Detected version: ${latestSemver}`);
      return latestSemver;
    }

    // No semver tags found. Warn and use default.
    warning('No semver-like tags found (e.g., v1, v1.0.0). Using "main" as version.');
    return 'main';
  } catch (err) {
    debug(`Failed to detect version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return 'main';
  }
}
