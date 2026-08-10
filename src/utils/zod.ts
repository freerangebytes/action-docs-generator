import { ZodError, type z} from 'zod';
import { ValidationError } from './errors.js';

const MAX_REPORTED_ISSUES = 5;

const issuePath = (issue: ZodError['issues'][number]): string => issue.path.join('.') || 'root';

/**
 * Convert a Zod error into a ValidationError.
 *
 * All issues are reported, not just the first. A config with three mistakes
 * should surface three mistakes rather than one per run.
 */
export const zodErrorToValidationError = (error: ZodError): ValidationError => {
  const issues = error.issues;
  const firstIssue = issues[0];

  if (!firstIssue) {
    return new ValidationError('root', 'Validation failed');
  }

  if (issues.length === 1) {
    return new ValidationError(issuePath(firstIssue), firstIssue.message);
  }

  const reported = issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issuePath(issue)}: ${issue.message}`);

  const remaining = issues.length - reported.length;
  const suffix = remaining > 0 ? ` (and ${remaining.toString()} more)` : '';

  return new ValidationError(issuePath(firstIssue), `${reported.join('; ')}${suffix}`);
};

/**
 * Parses a value with a Zod schema and returns the parsed value. It wraps
 * the Zod error in a ValidationError.
 * @throws ValidationError if the value does not match the schema
 */
export const parseWithSchema = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw zodErrorToValidationError(result.error);
  }

  return result.data;
};
