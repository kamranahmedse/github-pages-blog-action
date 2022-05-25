import { execute } from './execute';
import { ConfigurationType } from './git';

export async function deploy(configuration: ConfigurationType) {
  const outputPath = configuration.outputDir;

  await execute(`git init`, outputPath);
  await execute(`git remote add origin ${configuration.repoUrl}`, outputPath);
  await execute(`git checkout -b ${configuration.branch}`, outputPath);
  await execute(`git add .`, outputPath);
  await execute(`git commit -m "[Action GitHub Pages Blog] Prepare blog"`, outputPath);
  await execute(`git push origin ${configuration.branch} --force`, outputPath);
}
