export const DEFAULT_TEMPLATE = `\
{{#if hasSection.title}}
{{h 1}} {{name}}

{{/if}}
{{#if hasSection.badges}}
{{#hasItems badges}}
{{#each badges}}
{{#if this.markdown}}{{{this.markdown}}}{{else}}[![{{this.label}}](https://img.shields.io/badge/{{urlencode this.label}}-{{urlencode this.message}}-{{this.color}}){{#if this.url}}]({{this.url}}){{else}}](.){{/if}}{{/if}} {{/each}}

{{/hasItems}}
{{/if}}
{{#if hasSection.description}}
{{{description}}}

{{/if}}
{{#if hasSection.requirements}}
{{h 2}} Requirements

{{#isRuntime runtime "docker"}}
- Docker-enabled GitHub Actions runner
{{else}}
- GitHub Actions runner with Node.js {{nodeVersion runtime}}+
{{/isRuntime}}

{{/if}}
{{#if hasSection.permissions}}
{{#hasItems permissions}}
{{h 2}} Permissions

This action requires the following permissions:
\`\`\`yaml
permissions:
{{#each permissions}}
  {{this.name}}: {{this.level}}
{{/each}}
\`\`\`

{{/hasItems}}
{{/if}}
{{#if hasSection.inputs}}
{{#hasItems inputs}}
{{h 2}} Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
{{#each inputs}}
| \`{{this.id}}\` | {{escapeTableCell this.description}} | {{yesNo this.required}} | {{formatDefault this.default}} |
{{/each}}

{{/hasItems}}
{{/if}}
{{#if hasSection.outputs}}
{{#hasItems outputs}}
{{h 2}} Outputs

| Name | Description |
|------|-------------|
{{#each outputs}}
| \`{{this.id}}\` | {{escapeTableCell this.description}} |
{{/each}}

{{/hasItems}}
{{/if}}
{{#if hasSection.usage}}
{{h 2}} Usage

\`\`\`yaml
{{{usage}}}
\`\`\`

{{/if}}
{{#if hasSection.examples}}
{{#hasItems examples}}
{{h 2}} Examples

{{#each examples}}
{{h 3}} {{this.title}}

{{this.description}}
\`\`\`yaml
{{{this.content}}}
\`\`\`

{{/each}}
{{/hasItems}}
{{/if}}
{{#if hasSection.contributing}}
{{h 2}} Contributing

{{#if contributing}}
{{{contributing}}}
{{else}}
Contributions are welcome! Please feel free to submit a Pull Request.
{{/if}}

{{/if}}
{{#if hasSection.license}}
{{h 2}} License

{{#if licenseContent}}
{{{licenseContent}}}
{{else}}
This project is licensed under the {{license}} License{{#if licensePath}} - see the [LICENSE]({{licensePath}}) file for details{{/if}}.
{{/if}}

{{/if}}
---

*Generated with [Action Docs Generator](https://github.com/freerangebytes/action-docs-generator){{#if includeGeneratedDate}} on {{generatedAt}}{{/if}}*
`;
