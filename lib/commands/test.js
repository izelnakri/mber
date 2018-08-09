import fs from 'fs-extra';
import chalk from 'chalk';
import buildTests from '../builders/build-tests';
import startBuilder from '../runners/start-builder';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import applicationFilesWatcher from '../runners/application-files-watcher';

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default async function(defaults={
  environment: 'test', debug: false, fastboot: true, watch: false, port: 4200, socketPort: 65511
}) {
  global.MBER_TEST_RUNNER = true;

  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const PROJECT_ROOT = await findProjectRoot();
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

  let spinner = Console.spinner(`building application... [Environment: ${OPTIONS.environment}]`);

  await fs.remove(`${PROJECT_ROOT}/tmp`);
  await fs.mkdir(`${PROJECT_ROOT}/tmp`);
  await fs.mkdir(`${PROJECT_ROOT}/tmp/assets`);

  spinner.stop();

  return Promise.all([
    startBuilder(PROJECT_ROOT, ENV)
  ].concat([
    fs.copy(`${VENDOR_PATH}/test-support.css`, `${PROJECT_ROOT}/tmp/assets/test-support.css`),
    fs.copy(`${VENDOR_PATH}/test-support.js`, `${PROJECT_ROOT}/tmp/assets/test-support.js`),
    buildTests({
      applicationName: ENV.modulePrefix || 'frontend',
      projectRoot: PROJECT_ROOT,
      ENV: ENV
    })
  ])).then(async ([buildConfig]) => {
    const startHTTPServer = require('../runners/start-http-server').default;

    startHTTPServer(buildConfig);

    if (!OPTIONS.watch) {
      const runTestsInShell = require('../runners/run-tests-in-shell').default;

      return await runTestsInShell(buildConfig.cliArguments);
    }

    Console.log(chalk.green(`Visit http://localhost:${buildConfig.cliArguments.port} to run your tests`));

    return applicationFilesWatcher(buildConfig);
  }).catch((error) => Console.error(error));
}

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
