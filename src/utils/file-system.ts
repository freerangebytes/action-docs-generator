import { readFile as fsReadFile, writeFile as fsWriteFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { FileNotFoundError, PathTraversalError } from './errors.js';

// Base directory for path validation. All file paths are validated relative to this.
const BASE_DIR = process.cwd();

/**
 * Validate that a path resolves within the base directory
 * @throws PathTraversalError if path escapes base directory
 */
function validatePath(userPath: string): string {
  const resolved = resolve(BASE_DIR, userPath);
  const rel = relative(BASE_DIR, resolved);

  // If relative path starts with '..' or is absolute, it escapes the base
  if (rel.startsWith('..') || resolve(rel) === rel) {
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
 * @throws PathTraversalError if path escapes base directory
 */
export async function writeFile(path: string, content: string): Promise<string> {
  const resolvedPath = validatePath(path);
  const dir = dirname(resolvedPath);

  if (!(await fileExists(dir))) {
    throw new Error(`Cannot write to '${resolvedPath}': directory '${dir}' does not exist`);
  }

  await fsWriteFile(resolvedPath, content, 'utf-8');
  return resolvedPath;
}

