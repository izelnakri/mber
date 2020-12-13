import fs from 'fs/promises';
import chalk from 'ansi-colors';
import startBuilder from '../runners/start-builder.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import parseCLIArguments from '../utils/parse-cli-arguments.js';
import applicationFilesWatcher from '../runners/application-files-watcher.js';

export default async function(defaults={
  environment: 'test', debug: false, fastboot: false, watch: false, port: 1234, socketPort: 65511,
  talk: true
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const spinner = Console.spinner(`building application... [Environment: ${OPTIONS.environment}]\n`);
  const projectRoot = await findProjectRoot();
  const ENV = (await import(`${projectRoot}/config/environment.js`)).default(OPTIONS.environment);

  await fs.rmdir(`${projectRoot}/tmp`, { recursive: true });
  await fs.mkdir(`${projectRoot}/tmp`);
  await fs.mkdir(`${projectRoot}/tmp/assets`);

  spinner.stop();

  return startBuilder(projectRoot, ENV).then(async (buildConfig) => {
    const startHTTPServer = (await import('../runners/start-http-server.js')).default;

    startHTTPServer(buildConfig);

    if (!OPTIONS.watch) {
      const runTestsInShell = (await import('../runners/run-tests-in-shell.js')).default;

      return await runTestsInShell(buildConfig.cliArguments);
    }

    Console.log(chalk.green(`Visit http://localhost:${buildConfig.cliArguments.port}/tests to run your tests`));

    if (buildConfig.cliArguments.socketPort) {
      return applicationFilesWatcher(buildConfig);
    }
  }).catch((error) => Console.error(error));
}

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
