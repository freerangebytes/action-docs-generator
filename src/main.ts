import * as core from '@actions/core';
import { loadConfig } from './config.js';
import { parseActionYaml } from './parser/action-parser.js';
import { generateReadme } from './generator/readme-generator.js';
import { info, error, group } from './utils/logger.js';

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
  try {
    const config = await group('Loading configuration', async () => {
      const cfg = await loadConfig();
      info(`Action path: ${cfg.actionPath}`);
      info(`Output path: ${cfg.outputPath}`);
      return cfg;
    });

    const metadata = await group('Parsing action metadata', async () => {
      const meta = await parseActionYaml(config.actionPath);
      info(`Action name: ${meta.name}`);
      info(`Inputs: ${meta.inputs.length}, Outputs: ${meta.outputs.length}`);
      return meta;
    });

    const result = await group('Generating README', async () => {
      return generateReadme(metadata, config);
    });

    core.setOutput('readme-path', result.outputPath);
    core.setOutput('content', result.content);
    core.setOutput('sections-generated', JSON.stringify(result.sectionsGenerated));

    await core.summary
      .addHeading('README Generated')
      .addTable([
        [
          { data: 'Action', header: true },
          { data: 'Output Path', header: true },
          { data: 'Sections', header: true },
        ],
        [metadata.name, result.outputPath, result.sectionsGenerated.length.toString()],
      ])
      .addDetails('Sections Generated', result.sectionsGenerated.join(', '))
      .write();

    info(`README generated successfully!`);
    info(`  Path: ${result.outputPath}`);
    info(`  Sections: ${result.sectionsGenerated.join(', ')}`);
  } catch (err) {
    if (err instanceof Error) {
      error(err);
      core.setFailed(err.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}
