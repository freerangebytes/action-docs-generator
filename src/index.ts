import * as core from '@actions/core';
import { run } from './main.js';

run().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : 'An unknown error occurred');
});
