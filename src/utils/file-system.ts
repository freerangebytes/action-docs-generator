import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  access,
  realpath,
  lstat,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, sep, join } from 'node:path';
import { FileNotFoundError, PathTraversalError } from './errors.js';

// Base directory for path validation. All file paths are validated relative to this.
const BASE_DIR = process.cwd();

/**
 * Check whether a resolved path lies inside the base directory.
 *
 * `relative()` returning '' means the path *is* the base directory. Comparing
 * against a leading '..' segment rather than the '..' prefix avoids rejecting
 * legitimate names such as '..config'.
 */
function isInsideBase(resolved: string): boolean {
  const rel = relative(BASE_DIR, resolved);
  if (rel === '') return true;
  if (isAbsolute(rel)) return false;
  return rel !== '..' && !rel.startsWith(`..${sep}`);
}

/**
 * Resolve symlinks as far as the path exists, then verify containment.
 *
 * Lexical resolution alone is not enough. A symlink inside the workspace can
 * point outside it, and in a PR-triggered workflow the tree is attacker
 * controlled. For a path that does not exist yet (a file about to be written)
 * the nearest existing ancestor is what gets checked.
 */
async function assertRealPathInsideBase(resolved: string, userPath: string): Promise<void> {
  let candidate = resolved;

  for (;;) {
    try {
      if (!isInsideBase(await realpath(candidate))) {
        throw new PathTraversalError(userPath);
      }
      return;
    } catch (error) {
      if (error instanceof PathTraversalError) throw error;
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;

      const parent = dirname(candidate);
      // Reached the filesystem root without finding an existing ancestor.
      if (parent === candidate) return;
      candidate = parent;
    }
  }
}

/**
 * Reject a path if any component below the base directory is a symlink.
 *
 * Writes get this stricter treatment than reads. Nothing legitimately writes
 * through a link, and following one is how a write escapes.
 *
 * Only components between the base directory and the target are examined.
 * Walking up from the filesystem root instead would trip over symlinked
 * ancestors of the workspace, which are common and harmless.
 *
 * `lstat` rather than `realpath`, because a dangling symlink (target does not
 * exist yet) raises ENOENT from `realpath`, yet writing through it still
 * creates the file at the link's target.
 */
async function assertNoSymlinks(resolved: string, userPath: string): Promise<void> {
  const rel = relative(BASE_DIR, resolved);
  if (rel === '') return;

  let current = BASE_DIR;

  for (const segment of rel.split(sep)) {
    current = join(current, segment);

    let info;
    try {
      info = await lstat(current);
    } catch {
      return; // Does not exist, so nothing below it can either.
    }

    if (info.isSymbolicLink()) {
      throw new PathTraversalError(`${userPath} (writing through a symlink is not allowed)`);
    }
  }
}

/**
 * Directories the generator must never write into, even though they sit inside
 * the workspace: git's own state, and the workflow definitions that run this
 * action — writing one of those is privilege escalation in CI.
 *
 * `.github` itself stays writable, since `.github/README.md` is a legitimate
 * place to publish a repository's documentation.
 */
const PROTECTED_DIRS = [['.git'], ['.github', 'workflows']];

function assertNotProtected(resolved: string, userPath: string): void {
  const segments = relative(BASE_DIR, resolved).split(sep);

  const blocked = PROTECTED_DIRS.find((dir) =>
    dir.every((segment, index) => segments[index] === segment)
  );

  if (blocked) {
    throw new PathTraversalError(`${userPath} (writing into '${blocked.join('/')}/' is not allowed)`);
  }
}

/**
 * Validate that a path resolves within the base directory
 * @throws PathTraversalError if path escapes base directory
 */
function validatePath(userPath: string): string {
  const resolved = resolve(BASE_DIR, userPath);

  if (!isInsideBase(resolved)) {
    throw new PathTraversalError(userPath);
  }

  return resolved;
}

/**
 * Check if a file exists
 * @throws PathTraversalError if path escapes base directory
 */
export async function fileExists(path: string): Promise<boolean> {
  const resolvedPath = validatePath(path);
  try {
    await access(resolvedPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file's contents as a string
 * @throws FileNotFoundError if the file doesn't exist
 * @throws PathTraversalError if path escapes base directory
 */
export async function readFile(path: string): Promise<string> {
  const resolvedPath = validatePath(path);
  await assertRealPathInsideBase(resolvedPath, path);
  try {
    return await fsReadFile(resolvedPath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new FileNotFoundError(resolvedPath);
    }
    throw error;
  }
}

/**
 * Write content to a file
 * @throws Error if the parent directory doesn't exist
 * @throws PathTraversalError if the path escapes the base directory, traverses
 *   a symlink, or targets a protected directory
 */
export async function writeFile(path: string, content: string): Promise<string> {
  const resolvedPath = validatePath(path);

  // With no symlink anywhere below the base directory, the lexically resolved
  // path is the real one, so the containment check in validatePath and the
  // protected-directory check below both hold against the actual target.
  await assertNoSymlinks(resolvedPath, path);
  assertNotProtected(resolvedPath, path);

  const dir = dirname(resolvedPath);

  if (!(await fileExists(dir))) {
    throw new Error(`Cannot write to '${resolvedPath}': directory '${dir}' does not exist`);
  }

  await fsWriteFile(resolvedPath, content, 'utf-8');
  return resolvedPath;
}
