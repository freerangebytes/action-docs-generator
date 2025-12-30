import { rawActionYamlSchema, type RawActionYaml } from '../schemas/action-metadata.js';
import { ValidationError } from '../utils/errors.js';
import { formatZodErrors } from '../utils/zod-errors.js';

/**
 * Validate that the raw YAML has all required fields for documentation generation.
 * @throws ValidationError with detailed message if validation fails
 */
export function validateActionYaml(raw: unknown): asserts raw is RawActionYaml {
  const result = rawActionYamlSchema.safeParse(raw);

  if (!result.success) {
    // Extract first error for backwards-compatible error messages
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join('.') || 'root';

    // Provide user-friendly error messages for common cases
    if (path === 'root' || !firstIssue) {
      throw new ValidationError('root', 'action.yaml must be a valid YAML object');
    }

    if (path === 'name') {
      throw new ValidationError('name', 'name is required and must be a non-empty string');
    }

    if (path === 'description') {
      throw new ValidationError('description', 'description is required and must be a non-empty string');
    }

    if (path === 'runs' || path === 'runs.using') {
      throw new ValidationError(path, firstIssue.message.includes('Required')
        ? 'runs must be an object with a using field'
        : firstIssue.message);
    }

    // For inputs/outputs validation errors
    if (path.startsWith('inputs.') || path.startsWith('outputs.')) {
      const parts = path.split('.');
      const entryName = parts[1];
      const field = parts[2];

      if (field === 'description') {
        throw new ValidationError(path, `'${entryName}' is missing a description`);
      }
    }

    // Generic error with full details
    throw new ValidationError(path, formatZodErrors(result.error));
  }
}
