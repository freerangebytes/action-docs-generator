import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { actionMetadataSchema } from './action-metadata.js';
import { parseWithSchema } from '../utils/zod.js';

/** Parse YAML the way action-parser does, then validate. */
const load = (yaml: string) => parseWithSchema(actionMetadataSchema, parse(yaml));

describe('actionMetadataSchema', () => {
  describe('valid actions', () => {
    it('accepts a minimal node action', () => {
      const meta = load(`
name: Minimal
description: A minimal action
runs:
  using: node24
`);

      expect(meta.name).toBe('Minimal');
      expect(meta.runs.using).toBe('node24');
      expect(meta.inputs).toEqual([]);
      expect(meta.outputs).toEqual([]);
    });

    it('accepts a docker action', () => {
      expect(
        load(`
name: Docker
description: A docker action
runs:
  using: docker
  image: Dockerfile
`).runs.using
      ).toBe('docker');
    });

    it('accepts a composite action', () => {
      expect(
        load(`
name: Composite
description: A composite action
runs:
  using: composite
  steps:
    - run: echo hi
      shell: bash
`).runs.using
      ).toBe('composite');
    });

    it('turns inputs and outputs into arrays carrying their id', () => {
      const meta = load(`
name: With IO
description: Has inputs and outputs
runs:
  using: node24
inputs:
  token:
    description: A token
    required: true
  level:
    description: A level
    default: info
outputs:
  result:
    description: The result
`);

      expect(meta.inputs).toEqual([
        { id: 'token', description: 'A token', default: undefined, required: true },
        { id: 'level', description: 'A level', default: 'info', required: false },
      ]);
      expect(meta.outputs).toEqual([{ id: 'result', description: 'The result' }]);
    });
  });

  // Regression: `default` was typed as z.string(), but YAML resolves unquoted
  // scalars by type, so these very common declarations failed the whole run.
  describe('non-string YAML scalars', () => {
    it('accepts numeric and boolean defaults, normalizing them to strings', () => {
      const meta = load(`
name: Scalars
description: Unquoted scalar defaults
runs:
  using: node24
inputs:
  retries:
    description: How many times to retry
    default: 3
  verbose:
    description: Whether to log verbosely
    default: true
  ratio:
    description: A ratio
    default: 1.5
`);

      expect(meta.inputs.map((i) => i.default)).toEqual(['3', 'true', '1.5']);
    });

    it('accepts a numeric description', () => {
      expect(
        load(`
name: Numeric
description: Has a numeric input description
runs:
  using: node24
inputs:
  year:
    description: 2026
`).inputs[0]?.description
      ).toBe('2026');
    });
  });

  describe('required normalization', () => {
    it.each([
      ['true', true],
      ['"true"', true],
      ['"TRUE"', true],
      ['" true "', true],
      ['false', false],
      ['"no"', false],
    ])('maps required: %s to %s', (declared, expected) => {
      const meta = load(`
name: Req
description: Required normalization
runs:
  using: node24
inputs:
  flag:
    description: A flag
    required: ${declared}
`);

      expect(meta.inputs[0]?.required).toBe(expected);
    });

    it('defaults required to false when absent', () => {
      const meta = load(`
name: Req
description: Required absent
runs:
  using: node24
inputs:
  flag:
    description: A flag
`);

      expect(meta.inputs[0]?.required).toBe(false);
    });
  });

  describe('required fields', () => {
    it.each([
      ['a non-object', 'just a string'],
      ['a missing name', 'description: d\nruns:\n  using: node24'],
      ['an empty name', 'name: ""\ndescription: d\nruns:\n  using: node24'],
      ['a missing description', 'name: n\nruns:\n  using: node24'],
      ['a missing runs', 'name: n\ndescription: d'],
      ['a missing runs.using', 'name: n\ndescription: d\nruns: {}'],
    ])('rejects %s', (_case, yaml) => {
      expect(() => load(yaml)).toThrow();
    });

    it('rejects an input without a description', () => {
      expect(() =>
        load(`
name: n
description: d
runs:
  using: node24
inputs:
  broken:
    required: true
`)
      ).toThrow(/description/);
    });

    it('rejects an output without a description', () => {
      expect(() =>
        load(`
name: n
description: d
runs:
  using: node24
outputs:
  broken: {}
`)
      ).toThrow(/description/);
    });
  });
});
