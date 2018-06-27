import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import buildTests from '../builders/build-tests';
import fullBuild from '../builders/full-build';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import transpileIndexHTML from '../transpilers/transpile-index-html';
import applicationFilesWatcher from '../runners/application-files-watcher';

const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const PROJECT_ROOT = findProjectRoot();
const VENDOR_PATH = `${__dirname}/../../vendor`;

export default async function(defaults={
  port: 4200, environment: 'test', fastboot: true, watch: false, socketPort: 65511
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const { environment } = OPTIONS;
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(environment);

  let spinner = Console.spinner(`building application... [Environment: ${environment}]`);

  spinner.stop();

  return Promise.all([fullBuild(PROJECT_ROOT, { ENV })].concat([
    buildTestVendorCSS(),
    buildTestVendorJS(),
    buildTests(environment, ENV),
    buildIndexHTML(ENV),
  ])).then(([buildConfig]) => {
    const startHTTPServer = require('../runners/start-http-server').default;

    startHTTPServer(environment, ENV, { port: OPTIONS.port });

    if (!OPTIONS.watch) {
      const runTestsInShell = require('../runners/run-tests-in-shell').default;

      return runTestsInShell(OPTIONS);
    }

    Console.log(chalk.green(`Visit http://localhost:${OPTIONS.port} to run your tests`));

    return applicationFilesWatcher(environment, {
      buildConfig: buildConfig,
      socketPort: OPTIONS.socketPort,
    });
  }).catch((error) => Console.error(error));
}

function buildTestVendorCSS() {
  return new Promise((resolve) => {
    copyFileAsync(`${VENDOR_PATH}/test-support.css`, `${PROJECT_ROOT}/tmp/assets/test-support.css`)
      .then(() => resolve())
      .catch((error) => Console.error('ERROR:', error));
  });
}

function buildTestVendorJS() {
  return new Promise((resolve) => {
    readFileAsync(`${VENDOR_PATH}/test-support.js`).then((emberTestingContents) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/assets/test-support.js`, emberTestingContents);
    }).then(() => resolve())
      .catch((error) => Console.error('ERROR:', error));
  });
}

function buildIndexHTML(ENV) {
  return new Promise((resolve) => {
    readFileAsync(`${PROJECT_ROOT}/tests/index.html`).then((htmlBuffer) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/index.html`, transpileIndexHTML(
        htmlBuffer.toString(),
        ENV,
        { indexHTMLInjections: {} }
      ));
    }).then(() => resolve())
      .catch((error) => console.log('ERROR:', error));
  });
}

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
