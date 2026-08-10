import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile as fsWriteFile, mkdir, rm, symlink } from 'node:fs/promises';
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

    // Reads and writes are deliberately asymmetric. A read through a link that
    // lands inside the workspace yields content already in the repository, so
    // containment is the whole requirement. A write through any link is
    // refused. Nothing legitimately needs it, and following one is how a write
    // escapes into somewhere it should not reach.
    describe('symlinks', () => {
      it('blocks reading through a symlink pointing outside the workspace', async () => {
        await symlink('/etc/passwd', join(TEST_DIR, 'escape.txt'));

        await expect(readFile('test-fixtures-fs/escape.txt')).rejects.toThrow(PathTraversalError);
      });

      it('blocks reading through a symlinked directory pointing outside the workspace', async () => {
        await symlink('/etc', join(TEST_DIR, 'etc-link'));

        await expect(readFile('test-fixtures-fs/etc-link/passwd')).rejects.toThrow(
          PathTraversalError
        );
      });

      // A repository symlinking LICENSE -> LICENSE.md, or sharing a docs file
      // across a monorepo, must keep working.
      it('allows reading through a symlink that stays inside the workspace', async () => {
        await fsWriteFile(join(TEST_DIR, 'real.txt'), 'inside');
        await symlink(join(TEST_DIR, 'real.txt'), join(TEST_DIR, 'link.txt'));

        expect(await readFile('test-fixtures-fs/link.txt')).toBe('inside');
      });

      it('blocks writing through a symlink pointing outside the workspace', async () => {
        await symlink('/tmp/pwned.txt', join(TEST_DIR, 'out.txt'));

        await expect(writeFile('test-fixtures-fs/out.txt', 'x')).rejects.toThrow(
          PathTraversalError
        );
      });

      it('blocks writing through a symlink even when it stays inside the workspace', async () => {
        await fsWriteFile(join(TEST_DIR, 'real.txt'), 'inside');
        await symlink(join(TEST_DIR, 'real.txt'), join(TEST_DIR, 'link.txt'));

        await expect(writeFile('test-fixtures-fs/link.txt', 'x')).rejects.toThrow(
          PathTraversalError
        );
        expect(await readFile('test-fixtures-fs/real.txt')).toBe('inside');
      });

      it('blocks writing into a symlinked directory inside the workspace', async () => {
        await mkdir(join(TEST_DIR, 'real-dir'));
        await symlink(join(TEST_DIR, 'real-dir'), join(TEST_DIR, 'dir-link'));

        await expect(writeFile('test-fixtures-fs/dir-link/out.txt', 'x')).rejects.toThrow(
          PathTraversalError
        );
        expect(await fileExists('test-fixtures-fs/real-dir/out.txt')).toBe(false);
      });

      // realpath reports ENOENT for a link whose target does not exist yet, but
      // writing through it still creates the file at the target.
      it('blocks writing through a dangling symlink', async () => {
        await symlink('/tmp/dangling-pwned.txt', join(TEST_DIR, 'dangling.txt'));

        await expect(writeFile('test-fixtures-fs/dangling.txt', 'x')).rejects.toThrow(
          PathTraversalError
        );
      });
    });

    describe('protected directories', () => {
      it.each(['.git/config', '.git/hooks/pre-commit', '.github/workflows/evil.yaml'])(
        'refuses to write to %s',
        async (target) => {
          await expect(writeFile(target, 'malicious')).rejects.toThrow(PathTraversalError);
        }
      );

      it('refuses to write through a symlink into a protected directory', async () => {
        const escapee = join(process.cwd(), '.github/workflows/__leaked-by-test.yaml');
        await symlink(join(process.cwd(), '.github/workflows'), join(TEST_DIR, 'wf-link'));

        try {
          await expect(
            writeFile('test-fixtures-fs/wf-link/__leaked-by-test.yaml', 'x')
          ).rejects.toThrow(PathTraversalError);
          // If the guard ever regresses, the write lands in a real workflow
          // directory — make sure a failing run cannot leave it behind.
          expect(await fileExists('.github/workflows/__leaked-by-test.yaml')).toBe(false);
        } finally {
          await rm(escapee, { force: true });
        }
      });

      // .github/README.md is a supported location for repository documentation,
      // so .github itself must stay writable.
      it('allows writing to .github/README.md', async () => {
        const result = await writeFile('.github/README.md', '# docs');
        expect(result).toContain('.github/README.md');
        await rm(result, { force: true });
      });

      it('allows writing elsewhere in the workspace', async () => {
        const result = await writeFile('test-fixtures-fs/ok.md', 'fine');
        expect(result).toContain('test-fixtures-fs/ok.md');
      });
    });

    it('allows a legitimate name beginning with two dots', async () => {
      await fsWriteFile(join(TEST_DIR, '..config'), 'dotted');

      expect(await readFile('test-fixtures-fs/..config')).toBe('dotted');
    });
  });
});
