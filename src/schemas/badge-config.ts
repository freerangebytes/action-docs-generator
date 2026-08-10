import { z } from 'zod';
import { isPrivateAddress } from '../utils/ip-validation.js';

const MAX_URL_LENGTH = 200;

/**
 * Characters that terminate a markdown link or image destination.
 *
 * Badge URLs are interpolated into `[![label](img)](url)` in the default
 * template. Handlebars HTML-escapes `& < > " ' \` =` but not these, so a URL
 * containing one would close the link early and let the rest of the value
 * render as arbitrary markdown.
 */
const MARKDOWN_BREAKOUT = /[)\]\\<>]/;

/**
 * Characters that terminate the text half of a markdown link or image.
 *
 * `label` is rendered raw as the alt text of `[![label](img)](url)`, so a label
 * containing one of these closes the alt text early and lets whatever follows
 * supply its own link destination — which would make the URL rules below
 * trivially bypassable. `message` needs no equivalent rule: the default
 * template only ever emits it through `urlencode`.
 *
 * `markdown` stays unrestricted on purpose; a pre-rendered badge is markdown by
 * definition, and that is what the field is documented to accept.
 */
const MARKDOWN_TEXT_BREAKOUT = /[[\]\\]/;

function validateHttpUrl(url: string): { valid: true } | { valid: false; error: string } {
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

  if (MARKDOWN_BREAKOUT.test(url)) {
    return {
      valid: false,
      error: 'URL cannot contain the characters ) ] \\ < or >; percent-encode them instead',
    };
  }

  return { valid: true };
}

// Validates http/https URLs that don't point to private addresses and can't
// break out of the markdown link they are rendered into.
const httpUrlSchema = z
  .string()
  .trim()
  .max(MAX_URL_LENGTH)
  .superRefine((url, ctx) => {
    const result = validateHttpUrl(url);
    if (!result.valid) {
      ctx.addIssue({ code: 'custom', message: result.error });
    }
  });

const labelSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((label) => !MARKDOWN_TEXT_BREAKOUT.test(label), {
    message: 'Label cannot contain the characters [ ] or \\',
  });

// Rendered into a shields.io URL path, so it must not introduce path segments
// or escape the surrounding markdown.
const colorSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^#?[A-Za-z0-9]+$/, 'Color must be a name or hex code, e.g. "green" or "#4c1"');

const badgeObjectSchema = z
  .object({
    label: labelSchema.optional(),
    message: z.string().min(1).max(200).optional(),
    color: colorSchema.optional(),
    url: httpUrlSchema.optional(),
    markdown: z.string().max(1000).optional(),
  })
  .refine(
    (badge) =>
      badge.markdown !== undefined ||
      (badge.label !== undefined && badge.message !== undefined && badge.color !== undefined),
    {
      message:
        'A badge needs either `markdown`, or all of `label`, `message` and `color`',
    }
  );

// A bare string is shorthand for a pre-rendered markdown badge, which is what
// `action.yaml` advertises alongside the object form.
export const badgeSchema = z.union([
  z.string().trim().min(1).max(1000).transform((markdown) => ({ markdown })),
  badgeObjectSchema,
]);

export type Badge = z.infer<typeof badgeSchema>;
