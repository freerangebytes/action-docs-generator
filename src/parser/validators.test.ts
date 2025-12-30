import { describe, it, expect } from 'vitest';
import { validateActionYaml } from './validators.js';

describe('validateActionYaml', () => {
  const minimalValidAction = {
    name: 'Test Action',
    description: 'A test action',
    runs: {
      using: 'node20',
      main: 'dist/index.js',
    },
  };

  describe('valid actions', () => {
    it('accepts minimal node action', () => {
      expect(() => validateActionYaml(minimalValidAction)).not.toThrow();
    });

    it('accepts docker action', () => {
      expect(() =>
        validateActionYaml({
          name: 'Docker Action',
          description: 'A docker action',
          runs: {
            using: 'docker',
            image: 'Dockerfile',
          },
        })
      ).not.toThrow();
    });

    it('accepts composite action', () => {
      expect(() =>
        validateActionYaml({
          name: 'Composite Action',
          description: 'A composite action',
          runs: {
            using: 'composite',
            steps: [{ run: 'echo hello' }],
          },
        })
      ).not.toThrow();
    });

    it('accepts action with inputs and outputs', () => {
      expect(() =>
        validateActionYaml({
          ...minimalValidAction,
          inputs: {
            'my-input': { description: 'An input' },
          },
          outputs: {
            'my-output': { description: 'An output' },
          },
        })
      ).not.toThrow();
    });
  });

  describe('required fields', () => {
    it('rejects non-object', () => {
      expect(() => validateActionYaml('not an object')).toThrow(
        'must be a valid YAML object'
      );
      expect(() => validateActionYaml(null)).toThrow('must be a valid YAML object');
    });

    it('rejects missing name', () => {
      expect(() =>
        validateActionYaml({
          description: 'A test action',
          runs: { using: 'node20', main: 'dist/index.js' },
        })
      ).toThrow('name is required');
    });

    it('rejects empty name', () => {
      expect(() =>
        validateActionYaml({
          name: '   ',
          description: 'A test action',
          runs: { using: 'node20', main: 'dist/index.js' },
        })
      ).toThrow('name is required');
    });

    it('rejects missing description', () => {
      expect(() =>
        validateActionYaml({
          name: 'Test Action',
          runs: { using: 'node20', main: 'dist/index.js' },
        })
      ).toThrow('description is required');
    });

    it('rejects missing runs', () => {
      expect(() =>
        validateActionYaml({
          name: 'Test Action',
          description: 'A test action',
        })
      ).toThrow('runs');
    });

    it('rejects missing runs.using', () => {
      expect(() =>
        validateActionYaml({
          name: 'Test Action',
          description: 'A test action',
          runs: { main: 'dist/index.js' },
        })
      ).toThrow('runs.using');
    });
  });

  describe('inputs validation', () => {
    it('rejects inputs that is not an object', () => {
      expect(() =>
        validateActionYaml({
          ...minimalValidAction,
          inputs: 'not an object',
        })
      ).toThrow('inputs');
    });

    it('rejects input without description', () => {
      expect(() =>
        validateActionYaml({
          ...minimalValidAction,
          inputs: {
            'my-input': { required: true },
          },
        })
      ).toThrow("'my-input' is missing a description");
    });

    it('rejects input that is not an object', () => {
      expect(() =>
        validateActionYaml({
          ...minimalValidAction,
          inputs: {
            'my-input': 'not an object',
          },
        })
      ).toThrow('my-input');
    });
  });

  describe('outputs validation', () => {
    it('rejects outputs that is not an object', () => {
      expect(() =>
        validateActionYaml({
          ...minimalValidAction,
          outputs: 'not an object',
        })
      ).toThrow('outputs');
    });

    it('rejects output without description', () => {
      expect(() =>
        validateActionYaml({
          ...minimalValidAction,
          outputs: {
            'my-output': { value: 'something' },
          },
        })
      ).toThrow("'my-output' is missing a description");
    });
  });
});
