import fs from 'fs-extra';
import chalk from 'ansi-colors';
import startBuilder from '../runners/start-builder';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import applicationFilesWatcher from '../runners/application-files-watcher';

export default async function(defaults={
  environment: 'test', debug: false, fastboot: false, watch: false, port: 1234, socketPort: 65511,
  talk: true
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const spinner = Console.spinner(`building application... [Environment: ${OPTIONS.environment}]\n`);
  const projectRoot = await findProjectRoot();
  const ENV = require(`${projectRoot}/config/environment`)(OPTIONS.environment);

  await fs.remove(`${projectRoot}/tmp`);
  await fs.mkdir(`${projectRoot}/tmp`);
  await fs.mkdir(`${projectRoot}/tmp/assets`);

  spinner.stop();

  startBuilder(projectRoot, ENV).then(async (buildConfig) => {
    const startHTTPServer = require('../runners/start-http-server').default;

    startHTTPServer(buildConfig);

    if (!OPTIONS.watch) {
      const runTestsInShell = require('../runners/run-tests-in-shell').default;

      return await runTestsInShell(buildConfig.cliArguments);
    }

    Console.log(chalk.green(`Visit http://localhost:${buildConfig.cliArguments.port}/tests to run your tests`));

    if (buildConfig.cliArguments.socketPort) {
      return applicationFilesWatcher(buildConfig);
    }
  }).catch((error) => Console.error(error));
}

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
