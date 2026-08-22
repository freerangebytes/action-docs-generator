# Action Docs Generator

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

## Requirements

- GitHub Actions runner with Node.js 24+

## Permissions

This action requires the following permissions:
```yaml
permissions:
  contents: read
```

## Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `action-path` | Path to the action.yaml or action.yml file to document | No | `./action.yaml` |
| `output-path` | Path where the generated README should be written | No | `./README.md` |
| `description` | Custom description to use instead of the one from action.yaml | No | - |
| `description-path` | Path to a markdown file containing the description. Mutually exclusive with description | No | - |
| `contributing` | Contributing guidance to include in the README | No | - |
| `contributing-path` | Path to a markdown file containing the contributing guidance. Mutually exclusive with contributing | No | - |
| `template` | Custom Handlebars template to render the README with | No | - |
| `template-path` | Path to a custom Handlebars template file. Mutually exclusive with template | No | - |
| `badges` | JSON array of badges. Each entry is either {label, message, color, url?} or a ready-made markdown string | No | - |
| `badges-path` | Path to a YAML or JSON file containing badge configurations. Mutually exclusive with badges | No | - |
| `permissions` | JSON object mapping permission names to levels, e.g. {"contents": "read"} | No | - |
| `permissions-path` | Path to a YAML or JSON file containing the permissions map. Mutually exclusive with permissions | No | - |
| `examples` | JSON array of examples [{title, description, name?, version?, with?}] | No | - |
| `examples-path` | Path to a YAML or JSON file containing custom examples. Mutually exclusive with examples | No | - |
| `example` | Shorthand for a single hand-written usage example. Mutually exclusive with examples | No | - |
| `license` | License identifier (e.g., MIT, Apache-2.0) | No | `MIT` |
| `license-path` | Path to the license file, used as the link target in the License section | No | - |
| `load-license-file-content` | Whether to inline the contents of license-path instead of linking to it | No | `false` |
| `include-sections` | Comma-separated list of sections to include (all if empty). Available: title, badges, description, requirements, permissions, inputs, outputs, usage, examples, contributing, license | No | - |
| `exclude-sections` | Comma-separated list of sections to exclude | No | - |
| `repository-url` | Repository URL for generated links (auto-detected if in GitHub Actions) | No | - |
| `header-level` | Starting header level for generated sections (1, 2, or 3) | No | `1` |
| `include-generated-date` | Whether or not to include the date the README was generated. | No | `false` |
| `version` | Version tag to use in generated examples. Set to an empty string to auto-detect the latest tag instead | No | `RELEASE-VERSION` |
| `github-token` | Token used to read repository tags, only when version is set to an empty string | No | `${{ github.token }}` |

## Outputs

| Name | Description |
|------|-------------|
| `readme-path` | Absolute path to the generated README file |
| `content` | The generated README content as a string. Note this includes any inlined file contents, such as the license when load-license-file-content is set |
| `sections-generated` | JSON array of section names that were included in the output |

## Usage

```yaml
- uses: freerangebytes/action-docs-generator@RELEASE-VERSION
  with:
    action-path: ./action.yaml
    output-path: ./README.md
    license: MIT
    load-license-file-content: false
    header-level: 1
    include-generated-date: false
    version: RELEASE-VERSION
    github-token: ${{ github.token }}
```

## Examples

### Basic Usage

Generate README with default settings.
```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@RELEASE-VERSION
```

### Custom Output Path

Generate README to a different location.
```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@RELEASE-VERSION
  with:
    output-path: ./docs/ACTION_README.md
```

### With Badges

Add custom badges to the generated README.
```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@RELEASE-VERSION
  with:
    badges: |-
      [
        {"label": "build", "message": "passing", "color": "green"},
        {"label": "coverage", "message": "90%", "color": "brightgreen"}
      ]
```

### Custom Examples

Load examples from a file to include in the README.
```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@RELEASE-VERSION
  with:
    examples-path: ./.docs/examples.yaml
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Generated with [Action Docs Generator](https://github.com/freerangebytes/action-docs-generator)*
