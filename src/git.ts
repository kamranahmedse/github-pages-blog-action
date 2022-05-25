import { info } from '@actions/core';
import { execute } from './execute';

export type ConfigurationType = {
  repoPath: string;
  pusherName: string;
  pusherEmail: string;
  repoUrl: string;
  token: string;
  repositoryName: string;
  hostname: string;
  outputDir: string;
  branch: string;
  themeDir: string;
};

export async function configureRepo(configuration: ConfigurationType) {
  info('Configuring git');

  try {
    await execute(
      `git config --global --add safe.directory "${configuration.repoPath}"`,
      configuration.repoPath
    );
  } catch {
    info('Unable to set repoPath as a safe directory…');
  }

  await execute(`git config --global init.defaultBranch master`, configuration.repoPath);
  await execute(`git config user.name "${configuration.pusherName}"`, configuration.repoPath);
  await execute(`git config user.email "${configuration.pusherEmail}"`, configuration.repoPath);
  await execute(`git config core.ignorecase false`, configuration.repoPath);

  await execute(`git remote rm origin`, configuration.repoPath);
  await execute(`git remote add origin ${configuration.repoUrl}`, configuration.repoPath);

  info('Git configured');
}
