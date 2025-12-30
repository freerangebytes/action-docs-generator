import type Handlebars from 'handlebars';

/**
 * Register conditional/comparison helpers
 */
export function registerConditionalHelpers(handlebars: typeof Handlebars): void {
  handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

  handlebars.registerHelper(
    'isRuntime',
    function (this: unknown, using: string, type: string, options: Handlebars.HelperOptions) {
      return using === type ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    'hasItems',
    function (this: unknown, array: unknown[], options: Handlebars.HelperOptions) {
      const hasItems = Array.isArray(array) && array.length > 0;
      return hasItems ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    'hasRequiredInputs',
    function (this: unknown, inputs: { required?: boolean }[], options: Handlebars.HelperOptions) {
      const hasRequired = Array.isArray(inputs) && inputs.some((input) => input.required);
      return hasRequired ? options.fn(this) : options.inverse(this);
    }
  );
}
