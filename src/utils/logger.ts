import * as core from '@actions/core';

/**
 * Log an informational message
 */
export function info(message: string): void {
  core.info(message);
}

/**
 * Log a warning message
 */
export function warning(message: string): void {
  core.warning(message);
}

/**
 * Log an error message
 */
export function error(message: string | Error): void {
  core.error(message);
}

/**
 * Log a debug message (only visible when ACTIONS_STEP_DEBUG is set)
 */
export function debug(message: string): void {
  core.debug(message);
}

/**
 * Start a log group
 */
export function startGroup(name: string): void {
  core.startGroup(name);
}

/**
 * End a log group
 */
export function endGroup(): void {
  core.endGroup();
}

/**
 * Log within a group
 */
export async function group<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return core.group(name, fn);
}
