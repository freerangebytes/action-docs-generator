import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadExamples } from './examples.js';
import { ConfigError } from './errors.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures-examples');

describe('loadExamples', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('loads valid examples file', async () => {
    const content = `
examples:
  - title: Example One
    description: First example description here
  - title: Example Two
    description: Second example description here
    with:
      input-name: value
`;
    await writeFile(join(TEST_DIR, 'examples.yaml'), content);

    const examples = await loadExamples('test-fixtures-examples/examples.yaml');

    expect(examples).toHaveLength(2);
    expect(examples[0]?.title).toBe('Example One');
    expect(examples[1]?.title).toBe('Example Two');
    expect(examples[1]?.with).toEqual({ 'input-name': 'value' });
  });

  it('throws ConfigError for non-existing file', async () => {
    await expect(loadExamples('test-fixtures-examples/missing.yaml')).rejects.toThrow(ConfigError);
    await expect(loadExamples('test-fixtures-examples/missing.yaml')).rejects.toThrow('not found');
  });

  it('throws ConfigError for invalid YAML', async () => {
    await writeFile(join(TEST_DIR, 'invalid.yaml'), '{ invalid yaml ::');

    await expect(loadExamples('test-fixtures-examples/invalid.yaml')).rejects.toThrow(ConfigError);
    await expect(loadExamples('test-fixtures-examples/invalid.yaml')).rejects.toThrow('parse');
  });

  it('throws ConfigError for missing examples key', async () => {
    await writeFile(join(TEST_DIR, 'no-key.yaml'), 'title: No examples key');

    await expect(loadExamples('test-fixtures-examples/no-key.yaml')).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError for empty examples array', async () => {
    await writeFile(join(TEST_DIR, 'empty.yaml'), 'examples: []');

    await expect(loadExamples('test-fixtures-examples/empty.yaml')).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError for example with short title', async () => {
    const content = `
examples:
  - title: AB
    description: Description is long enough
`;
    await writeFile(join(TEST_DIR, 'short-title.yaml'), content);

    await expect(loadExamples('test-fixtures-examples/short-title.yaml')).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError for example with short description', async () => {
    const content = `
examples:
  - title: Valid Title
    description: Short
`;
    await writeFile(join(TEST_DIR, 'short-desc.yaml'), content);

    await expect(loadExamples('test-fixtures-examples/short-desc.yaml')).rejects.toThrow(ConfigError);
  });

  it('accepts example with optional fields', async () => {
    const content = `
examples:
  - title: Full Example
    description: This is a complete example with all fields
    name: Custom Step Name
    version: v2.0.0
    with:
      param1: value1
      param2: value2
`;
    await writeFile(join(TEST_DIR, 'full.yaml'), content);

    const examples = await loadExamples('test-fixtures-examples/full.yaml');

    expect(examples[0]?.name).toBe('Custom Step Name');
    expect(examples[0]?.version).toBe('v2.0.0');
    expect(examples[0]?.with).toEqual({ param1: 'value1', param2: 'value2' });
  });

  it('rejects invalid version format', async () => {
    const content = `
examples:
  - title: Bad Version
    description: This example has an invalid version
    version: "!!invalid!!"
`;
    await writeFile(join(TEST_DIR, 'bad-version.yaml'), content);

    await expect(loadExamples('test-fixtures-examples/bad-version.yaml')).rejects.toThrow(ConfigError);
  });
});
