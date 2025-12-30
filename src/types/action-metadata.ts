/**
 * Represents a single input parameter from action.yaml
 */
export interface ActionInput {
  /** Unique identifier for the input */
  id: string;
  /** Human-readable description of the input */
  description: string;
  /** Whether this input is required */
  required: boolean;
  /** Default value if not provided */
  default?: string;
}

/**
 * Represents a single output parameter from action.yaml
 */
export interface ActionOutput {
  /** Unique identifier for the output */
  id: string;
  /** Human-readable description of the output */
  description: string;
}

/**
 * Runs configuration - only fields used for documentation
 */
export interface ActionRuns {
  /** Action type: node20, node24, docker, or composite */
  using: string;
}

/**
 * Parsed action.yaml structure - only fields used for documentation
 */
export interface ActionMetadata {
  /** Action display name */
  name: string;
  /** Brief description of what the action does */
  description: string;
  /** Input parameters */
  inputs: ActionInput[];
  /** Output parameters */
  outputs: ActionOutput[];
  /** Runs configuration */
  runs: ActionRuns;
}

// Re-export RawActionYaml from schema (schema is the source of truth)
export type { RawActionYaml } from '../schemas/action-metadata.js';
