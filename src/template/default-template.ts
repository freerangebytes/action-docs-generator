// Default Handlebars template for README generation
export const DEFAULT_TEMPLATE = `{{#if hasSection.title}}
{{h 1}} {{action.name}}

{{/if}}
{{#if hasSection.badges}}
{{#hasItems config.badges}}
{{#each config.badges}}
{{#if this.markdown}}{{{this.markdown}}}{{else}}[![{{this.label}}](https://img.shields.io/badge/{{urlencode this.label}}-{{urlencode this.message}}-{{this.color}}){{#if this.url}}]({{this.url}}){{else}}](.){{/if}}{{/if}} {{/each}}

{{/hasItems}}
{{/if}}
{{#if hasSection.description}}
{{action.description}}

{{/if}}
{{#if hasSection.requirements}}
{{h 2}} Requirements

{{#isRuntime action.runs.using "docker"}}
- Docker-enabled GitHub Actions runner
{{else}}
- GitHub Actions runner with Node.js {{nodeVersion action.runs.using}}+
{{/isRuntime}}

{{/if}}
{{#if hasSection.permissions}}
{{h 2}} Permissions

This action requires the following permissions:

\`\`\`yaml
permissions:
  contents: read
\`\`\`

{{/if}}
{{#if hasSection.inputs}}
{{#hasItems action.inputs}}
{{h 2}} Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
{{#each action.inputs}}
| \`{{this.id}}\` | {{escapeTableCell this.description}} | {{yesNo this.required}} | {{formatDefault this.default}} |
{{/each}}

{{/hasItems}}
{{/if}}
{{#if hasSection.outputs}}
{{#hasItems action.outputs}}
{{h 2}} Outputs

| Name | Description |
|------|-------------|
{{#each action.outputs}}
| \`{{this.id}}\` | {{escapeTableCell this.description}} |
{{/each}}

{{/hasItems}}
{{/if}}
{{#if hasSection.usage}}
{{h 2}} Usage

\`\`\`yaml
- name: {{action.name}}
  uses: {{config.repositoryUrl}}@{{config.version}}
{{#hasItems action.inputs}}
{{#hasRequiredInputs action.inputs}}
  with:
{{#each action.inputs}}
{{#if this.required}}
    {{this.id}}: # Required: {{this.description}}
{{else}}
    {{inputComment this}}
{{/if}}
{{/each}}
{{else}}
  # with:
{{#each action.inputs}}
  {{inputCommentFull this}}
{{/each}}
{{/hasRequiredInputs}}
{{/hasItems}}
\`\`\`

{{#if config.example}}
{{h 3}} Custom Example

\`\`\`yaml
{{{config.example}}}
\`\`\`

{{/if}}
{{/if}}
{{#if hasSection.examples}}
{{h 2}} Examples

{{#hasItems config.examples}}
{{#each config.examples}}
{{h 3}} {{this.title}}

{{this.description}}

\`\`\`yaml
- name: {{#if this.name}}{{this.name}}{{else}}{{../action.name}}{{/if}}
  uses: {{../config.repositoryUrl}}@{{#if this.version}}{{this.version}}{{else}}{{../config.version}}{{/if}}
{{#if this.with}}
  with:
{{#each this.with}}
    {{@key}}: {{{yamlValue this 6}}}
{{/each}}
{{/if}}
\`\`\`

{{/each}}
{{else}}
{{h 3}} Basic Usage

\`\`\`yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: {{action.name}}
        uses: {{config.repositoryUrl}}@{{config.version}}
{{#hasRequiredInputs action.inputs}}
        with:
{{#each action.inputs}}
{{#if this.required}}
          {{this.id}}: # Required
{{/if}}
{{/each}}
{{/hasRequiredInputs}}
\`\`\`

{{/hasItems}}
{{/if}}
{{#if hasSection.contributing}}
{{h 2}} Contributing

{{#if config.contributingUrl}}
Please see [CONTRIBUTING.md]({{config.contributingUrl}}) for details on how to contribute to this project.
{{else}}
Contributions are welcome! Please feel free to submit a Pull Request.
{{/if}}

{{/if}}
{{#if hasSection.license}}
{{h 2}} License

This project is licensed under the {{config.license}} License - see the [LICENSE](LICENSE) file for details.

---

*Generated with [Action Docs Generator](https://github.com/freerangebytes/action-docs-generator) on {{helpers.generatedAt}}*
{{/if}}
`;
