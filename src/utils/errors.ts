/**
 * Base error class for action-docs-generator
 */
export class ActionDocsError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ActionDocsError';
  }
}

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends ActionDocsError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown when YAML parsing fails
 */
export class YamlParseError extends ActionDocsError {
  constructor(path: string, details: string) {
    super(`Failed to parse YAML in ${path}: ${details}`, 'YAML_PARSE_ERROR');
    this.name = 'YamlParseError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ActionDocsError {
  constructor(field: string, message: string) {
    super(`Validation failed for '${field}': ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when template processing fails
 */
export class TemplateError extends ActionDocsError {
  constructor(message: string) {
    super(`Template error: ${message}`, 'TEMPLATE_ERROR');
    this.name = 'TemplateError';
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigError extends ActionDocsError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

/**
 * Error thrown when path traversal is detected
 */
export class PathTraversalError extends ActionDocsError {
  constructor(path: string) {
    super(`Path traversal detected: ${path}`, 'PATH_TRAVERSAL');
    this.name = 'PathTraversalError';
  }
}
