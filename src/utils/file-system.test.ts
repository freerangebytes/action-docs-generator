import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile as fsWriteFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists, readFile, writeFile } from './file-system.js';
import { FileNotFoundError, PathTraversalError } from './errors.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures-fs');

describe('file-system', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('fileExists', () => {
    it('returns true for existing file', async () => {
      const filePath = join(TEST_DIR, 'exists.txt');
      await fsWriteFile(filePath, 'content');

      expect(await fileExists('test-fixtures-fs/exists.txt')).toBe(true);
    });

    it('returns false for non-existing file', async () => {
      expect(await fileExists('test-fixtures-fs/does-not-exist.txt')).toBe(false);
    });

    it('throws PathTraversalError for path outside base directory', async () => {
      await expect(fileExists('../outside.txt')).rejects.toThrow(PathTraversalError);
    });

    it('throws PathTraversalError for absolute path outside base', async () => {
      await expect(fileExists('/etc/passwd')).rejects.toThrow(PathTraversalError);
    });
  });

  describe('readFile', () => {
    it('reads file content', async () => {
      const filePath = join(TEST_DIR, 'read.txt');
      await fsWriteFile(filePath, 'test content');

      const content = await readFile('test-fixtures-fs/read.txt');
      expect(content).toBe('test content');
    });

    it('throws FileNotFoundError for non-existing file', async () => {
      await expect(readFile('test-fixtures-fs/missing.txt')).rejects.toThrow(FileNotFoundError);
    });

    it('throws PathTraversalError for path traversal attempt', async () => {
      await expect(readFile('test-fixtures-fs/../../../etc/passwd')).rejects.toThrow(PathTraversalError);
    });

    it('throws PathTraversalError for .. in path', async () => {
      await expect(readFile('../package.json')).rejects.toThrow(PathTraversalError);
    });
  });

  describe('writeFile', () => {
    it('writes content to file', async () => {
      const result = await writeFile('test-fixtures-fs/write.txt', 'new content');

      expect(result).toContain('test-fixtures-fs/write.txt');
      const content = await readFile('test-fixtures-fs/write.txt');
      expect(content).toBe('new content');
    });

    it('throws error when directory does not exist', async () => {
      await expect(
        writeFile('test-fixtures-fs/nonexistent/file.txt', 'content')
      ).rejects.toThrow('directory');
    });

    it('throws PathTraversalError for path traversal attempt', async () => {
      await expect(writeFile('../escape.txt', 'malicious')).rejects.toThrow(PathTraversalError);
    });
  });

  describe('path traversal protection', () => {
    it('blocks encoded path traversal', async () => {
      await expect(readFile('test-fixtures-fs/%2e%2e/package.json')).rejects.toThrow();
    });

    it('blocks path with multiple ..', async () => {
      await expect(readFile('test-fixtures-fs/a/../../b/../../../etc/passwd')).rejects.toThrow(PathTraversalError);
    });
  });
});
