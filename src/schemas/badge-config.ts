import { z } from 'zod';
import { isPrivateAddress } from '../utils/ip-validation.js';

/**
 * Validate a URL string and return validation result
 */
function validateHttpUrl(url: string): { valid: true; parsed: URL } | { valid: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use http or https protocol' };
  }

  if (isPrivateAddress(parsed.hostname.toLowerCase())) {
    return { valid: false, error: 'URL cannot reference private or internal addresses' };
  }

  return { valid: true, parsed };
}

// Validates http/https URLs that don't point to private addresses
const httpUrlSchema = z.string().superRefine((url, ctx) => {
  const result = validateHttpUrl(url);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error,
    });
  }
});

export const badgeSchema = z.object({
  label: z.string().min(1).max(100),
  message: z.string().min(1).max(200),
  color: z.string().min(1).max(50),
  url: httpUrlSchema.optional(),
  markdown: z.string().max(1000).optional(),
});

export const badgesArraySchema = z.array(badgeSchema);

export type Badge = z.infer<typeof badgeSchema>;
