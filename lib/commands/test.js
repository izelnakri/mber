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
  port: 4200, environment: 'test', fastboot: true, watch: false, socketPort: 65511
}) {
  global.MBER_TEST_RUNNER = true;

  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const PROJECT_ROOT = findProjectRoot();
  const ENTRYPOINT = `${PROJECT_ROOT}/tests/index.html`;
  const { environment } = OPTIONS;
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(environment);

  let spinner = Console.spinner(`building application... [Environment: ${environment}]`);

  spinner.stop();

  await fs.remove(`${PROJECT_ROOT}/tmp`),
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`)

  return Promise.all([
    startBuilder({
      entrypoint: ENTRYPOINT,
      ENV: ENV,
      projectRoot: PROJECT_ROOT
    })
  ].concat([
    buildTestVendorCSS(PROJECT_ROOT),
    buildTestVendorJS(PROJECT_ROOT),
    buildTests(ENV),
  ])).then(async ([buildConfig]) => {
    const startHTTPServer = require('../runners/start-http-server').default;

    startHTTPServer(ENV, { port: OPTIONS.port, fastboot: false, runningTests: true });

    if (!OPTIONS.watch) {
      const runTestsInShell = require('../runners/run-tests-in-shell').default;

      return await runTestsInShell(OPTIONS);
    }

    Console.log(chalk.green(`Visit http://localhost:${OPTIONS.port} to run your tests`));

    return applicationFilesWatcher(environment, {
      buildConfig: buildConfig,
      fastboot: false,
      socketPort: OPTIONS.socketPort,
    });
  }).catch((error) => Console.error(error));
}

function buildTestVendorCSS(PROJECT_ROOT) {
  return new Promise((resolve) => {
    fs.copyFile(`${VENDOR_PATH}/test-support.css`, `${PROJECT_ROOT}/tmp/assets/test-support.css`)
      .then(() => resolve())
      .catch((error) => Console.error('ERROR:', error));
  });
}

function buildTestVendorJS(PROJECT_ROOT) {
  return new Promise((resolve) => {
    fs.readFile(`${VENDOR_PATH}/test-support.js`).then((emberTestingContents) => {
      return fs.writeFile(`${PROJECT_ROOT}/tmp/assets/test-support.js`, emberTestingContents);
    }).then(() => resolve())
      .catch((error) => Console.error('ERROR:', error));
  });
}

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
