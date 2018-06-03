import fs from 'fs';
import { promisify } from 'util';
import applicationFilesWatcher from '../utils/application-files-watcher';
import buildTests from '../builders/build-tests';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import setupBuild from '../utils/setup-build';

const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const PROJECT_ROOT = findProjectRoot();
const VENDOR_PATH = `${__dirname}/../../vendor`;

// NOTE: do I need to do queryParam filters?
export default async function(defaults={
  port: 4200, environment: 'test', fastboot: true, watch: false, socketPort: 65511
}) {
  const ARGUMENTS = parseCLIArguments();
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  let spinner = Console.spinner(`building application... [Environment: ${ENVIRONMENT}]`);

  spinner.stop();

  return Promise.all([setupBuild(PROJECT_ROOT, ENVIRONMENT)].concat([
    buildTestVendorCSS(),
    buildTestVendorJS(),
    buildTests(ENVIRONMENT)
  ])).then(([buildConfig]) => {
    if (ARGUMENTS.watch || defaults.watch) {
      const PORT = ARGUMENTS.port || defaults.port;
      const SOCKET_PORT = ARGUMENTS.socketPort || defaults.socketPort;
      const startHTTPServer = require('../utils/start-http-server').default;

      startHTTPServer(ENVIRONMENT, PORT);

      return applicationFilesWatcher(ENVIRONMENT, SOCKET_PORT, { buildConfig: buildConfig });
    }

    // TODO: implement the CI mode
  }).catch((error) => console.log(error));
}

function buildTestVendorCSS() {
  return new Promise((resolve) => {
    copyFileAsync(`${VENDOR_PATH}/test-support.css`, `${PROJECT_ROOT}/tmp/test-support.css`)
      .then(() => resolve())
      .catch((error) => console.log('ERROR:', error));
  });
}

function buildTestVendorJS() {
  return new Promise((resolve) => {
    readFileAsync(`${VENDOR_PATH}/test-support.js`).then((emberTestingContents) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/test-support.js`, emberTestingContents);
    }).then(() => resolve())
      .catch((error) => console.log('ERROR:', error));
  });
}

// NOTE: --ci mode needed, investigate multiple browser runner and randomized test runners
