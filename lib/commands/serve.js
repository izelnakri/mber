import fs from 'fs-extra';
import { promisify } from 'util';
import buildFastbootPackageJSON from '../builders/build-fastboot-package-json';
import applicationFilesWatcher from '../utils/application-files-watcher';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import setupBuild from '../builders/setup-build';
import startHTTPServer from '../utils/start-http-server';

const ensureDirAsync = promisify(fs.ensureDir);
const copyAsync = promisify(fs.copy);

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;

export default async function(defaults={
  port: 1234, environment: 'development', fastboot: true, socketPort: 65511
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner(`Building development server... [Environment: ${OPTIONS.environment}]`);

  spinner.stop();

  return Promise.all([
    setupBuild(PROJECT_ROOT, OPTIONS.environment),
    OPTIONS.fastboot ? buildFastbootPackageJSON({
      "assets/application.css": "assets/application.css",
      "assets/vendor.js": "assets/vendor.js",
      "assets/application.js": "assets/application.js",
    }, OPTIONS.environment, 'tmp') : null,
    copyAsync(`${PROJECT_ROOT}/index.html`, `${PROJECT_ROOT}/tmp/index.html`),
    ensureDirAsync(`${PROJECT_ROOT}/tmp/assets`)
  ]).then(([buildConfig]) => {
    startHTTPServer(OPTIONS.environment, OPTIONS.port, { fastboot: OPTIONS.fastboot });

    applicationFilesWatcher(OPTIONS.environment, OPTIONS.socketPort, {
      entryPoint: ENTRYPOINT, buildConfig: buildConfig, fastboot: OPTIONS.fastboot
    });
  }).catch((error) => Console.error(error));
}

// NOTE: if production or demo then buildDist behind the background on each change
