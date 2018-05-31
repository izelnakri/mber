import fs from 'fs';
import { promisify } from 'util';
import Bundler from 'parcel-bundler';
import applicationFilesWatcher from '../utils/application-files-watcher';
import buildApplication from '../utils/build-application';
import buildCSS from '../utils/build-css';
import buildVendor from '../utils/build-vendor';
import buildTests from '../utils/build-tests';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';

const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const server = require('express')(); // TODO: there should be no server on CI mode, by default
const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/tests/index.html`;
const VENDOR_PATH = `${__dirname}/../../vendor`;

// const applicationName = projectRoot.slice(projectRoot.lastIndexOf('/') + 1, projectRoot.length);

// NOTE: do I need to do queryParam filters?
export default async function(defaults={
  port: 4200, environment: 'test', fastboot: true, watch: false
}) {
  const ARGUMENTS = Object.assign(defaults, parseCLIArguments());
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  let spinner = Console.spinner(`building application... [Environment: ${ENVIRONMENT}]`);

  spinner.stop();

  return Promise.all([
    buildCSS(ENVIRONMENT),
    buildTestVendorCSS(),
    buildVendor(ENVIRONMENT, { watching: ARGUMENTS.watch }),
    buildApplication(ENVIRONMENT),
    buildTestVendorJS(),
    buildTests(ENVIRONMENT)
  ]).then(() => {
    if (ARGUMENTS.watch) {
      const bundler = new Bundler(ENTRYPOINT, { hmrPort: 65511 }); // TODO: change log level, make this not compile
      const PORT = ARGUMENTS.port || defaults.port;

      server.use(bundler.middleware());

      // redirect / to /?hidepassed
      // add pause button
      
      server.listen(PORT);

      Console.log(`Server is running on http://localhost:${PORT} (Environment: ${ENVIRONMENT})\n`);

      return applicationFilesWatcher(ENVIRONMENT);
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
