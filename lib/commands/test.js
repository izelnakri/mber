import fs from 'fs';
import { promisify } from 'util';
// import { spawn } from 'child_process';
import applicationFilesWatcher from '../utils/application-files-watcher';
import buildTests from '../builders/build-tests';
import setupBuild from '../builders/setup-build';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';

const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const PROJECT_ROOT = findProjectRoot();
const VENDOR_PATH = `${__dirname}/../../vendor`;

export default async function(defaults={
  port: 4200, environment: 'test', fastboot: true, watch: false, socketPort: 65511
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  console.log('ENVIRONMENT is', OPTIONS.environment);

  let spinner = Console.spinner(`building application... [Environment: ${OPTIONS.environment}]`);

  spinner.stop();

  console.log('promise start');

  return Promise.all([setupBuild(PROJECT_ROOT, OPTIONS.environment)].concat([
    buildTestVendorCSS(),
    buildTestVendorJS(),
    buildTests(OPTIONS.environment)
  ])).then(([buildConfig]) => {
    console.log('promise end');

    const startHTTPServer = require('../utils/start-http-server').default;

    startHTTPServer(OPTIONS.environment, OPTIONS.port);

    if (OPTIONS.watch) {
      return applicationFilesWatcher(OPTIONS.environment, OPTIONS.socketPort, { buildConfig: buildConfig });
    }

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

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
