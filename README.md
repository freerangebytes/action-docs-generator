# Action Docs Generator

Generates comprehensive README documentation from action.yaml metadata files

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
| `template-path` | Path to a custom Handlebars template file (optional) | No | - |
| `license` | License type (e.g., MIT, Apache-2.0) or custom license text | No | `MIT` |
| `badges` | JSON array of badge configurations [{label, message, color, url}] or markdown badge strings | No | `[]` |
| `include-sections` | Comma-separated list of sections to include (all if empty). Available: title, badges, description, requirements, permissions, inputs, outputs, usage, examples, contributing, license | No | - |
| `exclude-sections` | Comma-separated list of sections to exclude | No | - |
| `example` | Custom usage example YAML to include in README | No | - |
| `examples-path` | Path to a YAML file containing custom examples [{title, description, name?, version?, with?}] | No | - |
| `contributing-url` | URL to CONTRIBUTING.md or contributing guidelines | No | - |
| `repository-url` | Repository URL for generated links (auto-detected if in GitHub Actions) | No | - |
| `header-level` | Starting header level for generated sections (1, 2, or 3) | No | `1` |
| `version` | Version tag to use in generated examples (e.g., v1, main, latest) | No | `main` |

## Outputs

| Name | Description |
|------|-------------|
| `readme-path` | Absolute path to the generated README file |
| `content` | The generated README content as a string |
| `sections-generated` | JSON array of section names that were included in the output |

## Usage

```yaml
- name: Action Docs Generator
  uses: freerangebytes/action-docs-generator@main
  # with:
  #   action-path: './action.yaml'
  #   output-path: './README.md'
  #   template-path: ''
  #   license: 'MIT'
  #   badges: '[]'
  #   include-sections: ''
  #   exclude-sections: ''
  #   example: ''
  #   examples-path: ''
  #   contributing-url: ''
  #   repository-url: ''
  #   header-level: '1'
  #   version: 'main'
```

## Examples

### Basic Usage

Generate README with default settings.

```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@main
```

### Custom Output Path

Generate README to a different location.

```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@main
  with:
    output-path: ./docs/ACTION_README.md
```

### With Badges

Add custom badges to the generated README.

```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@main
  with:
    badges: |
      [
        {"label": "build", "message": "passing", "color": "green"},
        {"label": "coverage", "message": "90%", "color": "brightgreen"}
      ]
      
```

### Custom Examples

Load examples from a file to include in the README.

```yaml
- name: Generate README
  uses: freerangebytes/action-docs-generator@main
  with:
    examples-path: ./.docs/examples.yaml
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Generated with [Action Docs Generator](https://github.com/freerangebytes/action-docs-generator) on 2025-12-31*
