Automatically generate comprehensive, well-structured README documentation from your GitHub Action's `action.yaml` metadata file.

## Features

- **Zero Configuration** - Works out of the box with sensible defaults
- **Complete Documentation** - Generates title, description, inputs table, outputs table, usage examples, and more
- **Customizable Sections** - Include or exclude specific sections as needed
- **Custom Templates** - Use your own Handlebars template for full control over output
- **Badge Support** - Add shields.io badges with simple JSON configuration
- **Multiple Examples** - Define custom usage examples via YAML configuration
- **Flexible Description** - Override the description with inline text or a markdown file

Keep your action's documentation in sync with its metadata automatically.

## Template Helpers

When supplying your own template via `template` or `template-path`, these
Handlebars helpers are available in addition to the built-in ones:

| Helper | Description |
|--------|-------------|
| `{{h <level>}}` | Heading marks for `<level>`, offset by `header-level` and capped at 6 |
| `{{yesNo <bool>}}` | Renders `Yes` or `No` |
| `{{join <array> <sep>}}` | Joins an array with a separator |
| `{{urlencode <string>}}` | Encodes a value for a shields.io badge URL |
| `{{escapeTableCell <string>}}` | Escapes a value for use in a markdown table cell |
| `{{formatDefault <string>}}` | Renders a default as inline code, or `-` when empty |
| `{{nodeVersion <runs.using>}}` | Extracts `20` from `node20` |
| `{{yamlValue <string> <indent>}}` | Renders a YAML scalar, quoting or using a block as needed |
| `{{inputComment <input> <indent>}}` | Renders an input as a commented-out `with:` entry |
| `{{#eq a b}}` | Block helper; strict equality |
| `{{#isRuntime <runs.using> "docker"}}` | Block helper; matches the runtime |
| `{{#hasItems <array>}}` | Block helper; runs when the array is non-empty |
| `{{#hasRequiredInputs <inputs>}}` | Block helper; runs when any input is required |

The template context provides `name`, `description`, `version`, `runtime`,
`repositoryUrl`, `license`, `licensePath`, `licenseContent`, `contributing`,
`contributingPath`, `usage`, `year`, `generatedAt`, `includeGeneratedDate`,
`headerLevel`, the `badges`, `inputs`, `outputs`, `permissions` and `examples`
arrays, plus `hasSection.<name>` for conditionally rendering each section.
