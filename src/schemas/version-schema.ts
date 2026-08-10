import { z } from 'zod';

const MIN_VERSION_LENGTH = 1;
const MAX_VERSION_LENGTH = 30;
const versionPattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

export const versionSchema = z.string().trim().min(MIN_VERSION_LENGTH).max(MAX_VERSION_LENGTH).regex(versionPattern, 'Invalid version format');
