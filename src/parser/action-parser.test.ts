import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { parseActionYaml } from './action-parser.js';
import { FileNotFoundError, YamlParseError, ValidationError } from '../utils/errors.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures-parser');
const REL = 'test-fixtures-parser';

const VALID = `
name: Fixture Action
description: A fixture action
runs:
  using: node24
inputs:
  token:
    description: A token
    required: true
`;

const fixture = async (name: string, content: string): Promise<string> => {
  await writeFile(join(TEST_DIR, name), content);
  return `${REL}/${name}`;
};

describe('parseActionYaml', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('path resolution', () => {
    it('reads an explicit .yaml path', async () => {
      const path = await fixture('action.yaml', VALID);

      expect((await parseActionYaml(path)).name).toBe('Fixture Action');
    });

    it('reads an explicit .yml path', async () => {
      const path = await fixture('action.yml', VALID);

      expect((await parseActionYaml(path)).name).toBe('Fixture Action');
    });

    it('appends .yaml when the path has no extension', async () => {
      await fixture('action.yaml', VALID);

      expect((await parseActionYaml(`${REL}/action`)).name).toBe('Fixture Action');
    });

    it('falls back to .yml when .yaml is absent', async () => {
      await fixture('action.yml', VALID);

      expect((await parseActionYaml(`${REL}/action`)).name).toBe('Fixture Action');
    });

    it('reports both attempted extensions when neither exists', async () => {
      await expect(parseActionYaml(`${REL}/missing`)).rejects.toThrow(FileNotFoundError);
      await expect(parseActionYaml(`${REL}/missing`)).rejects.toThrow('.yaml and .yml');
    });

    it('refuses to read outside the workspace', async () => {
      await expect(parseActionYaml('../outside.yaml')).rejects.toThrow(/traversal/i);
    });
  });

  describe('failures', () => {
    it('wraps a YAML syntax error with the file path', async () => {
      const path = await fixture('bad.yaml', 'name: [unclosed');

      await expect(parseActionYaml(path)).rejects.toThrow(YamlParseError);
      await expect(parseActionYaml(path)).rejects.toThrow('bad.yaml');
    });

    // The rewrite dropped validators.ts, which owned these messages.
    describe('actionable validation messages', () => {
      it('names the missing top-level field', async () => {
        const path = await fixture('no-name.yaml', 'description: d\nruns:\n  using: node24\n');

        await expect(parseActionYaml(path)).rejects.toThrow(ValidationError);
        await expect(parseActionYaml(path)).rejects.toThrow(/'name' is required/);
      });

      it('explains a malformed runs block', async () => {
        const path = await fixture('no-using.yaml', 'name: n\ndescription: d\nruns: {}\n');

        await expect(parseActionYaml(path)).rejects.toThrow(/runs\.using' is required/);
      });

      it('names the input that is missing a description', async () => {
        const path = await fixture(
          'bad-input.yaml',
          'name: n\ndescription: d\nruns:\n  using: node24\ninputs:\n  broken:\n    required: true\n'
        );

        await expect(parseActionYaml(path)).rejects.toThrow(
          /input 'broken' is missing a description/
        );
      });

      it('names the output that is missing a description', async () => {
        const path = await fixture(
          'bad-output.yaml',
          'name: n\ndescription: d\nruns:\n  using: node24\noutputs:\n  broken: {}\n'
        );

        await expect(parseActionYaml(path)).rejects.toThrow(
          /output 'broken' is missing a description/
        );
      });
    });
  });

  it('parses this repository\'s own action.yaml', async () => {
    const meta = await parseActionYaml('action.yaml');

    expect(meta.name).toBe('Action Docs Generator');
    expect(meta.runs.using).toBe('node24');
    expect(meta.inputs.length).toBeGreaterThan(0);
    expect(meta.outputs.map((o) => o.id)).toContain('readme-path');
  });
});
