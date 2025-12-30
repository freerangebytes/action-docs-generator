import { badgesArraySchema, type Badge } from '../schemas/badge-config.js';
import { ConfigError } from './errors.js';
import { formatZodErrors } from './zod-errors.js';

/**
 * Validate an array of badge configurations
 */
export function validateBadges(badges: unknown[]): Badge[] {
  const result = badgesArraySchema.safeParse(badges);
  if (!result.success) {
    throw new ConfigError(`Badge validation failed:\n  ${formatZodErrors(result.error)}`);
  }
  return result.data;
}
