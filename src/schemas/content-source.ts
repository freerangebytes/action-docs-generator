import { z } from 'zod';

const MIN_PATH_LENGTH = 3;
const MAX_PATH_LENGTH = 200;

export const pathField = z.string().trim().min(MIN_PATH_LENGTH).max(MAX_PATH_LENGTH);

/**
 * A section whose contents may be supplied inline or loaded from a file.
 *
 * The inner value schema is attached to the result as `valueSchema` so that
 * file-loaded content can be validated against the exact same rules as inline
 * content — otherwise every length and shape constraint would apply only to
 * the inline branch.
 */
export const contentSource = <T extends z.ZodTypeAny>(value: T) => {
  const schema = z
    .object({
      content: value.optional(),
      path: pathField.optional(),
    })
    .refine((source) => !(source.content !== undefined && source.path !== undefined), {
      message: 'Provide either inline content or a path, not both',
    });

  return Object.assign(schema, { valueSchema: value as T });
};

/**
 * The unresolved form of a section, as read from the action inputs.
 */
export interface ContentSource<T> {
  content?: T;
  path?: string;
}

/**
 * A section after resolution. `value` is populated from the inline content or
 * by reading and parsing `path`; `path` is retained for link rendering.
 */
export interface ResolvedSection<T> {
  value?: T;
  path?: string;
}
