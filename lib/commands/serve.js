import fs from 'fs-extra';
import { promisify } from 'util';
import buildFastbootPackageJSON from '../builders/build-fastboot-package-json';
import fullBuild from '../builders/full-build';
import transpileIndexHTML from '../transpilers/transpile-index-html';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import applicationFilesWatcher from '../runners/application-files-watcher';
import startHTTPServer from '../runners/start-http-server';

const ensureDirAsync = promisify(fs.ensureDir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;

export default async function(defaults={
  port: 1234, environment: 'development', fastboot: true, socketPort: 65511
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner(`Building development server... [Environment: ${OPTIONS.environment}]`);

  const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

  spinner.stop();

  return Promise.all([
    fullBuild(PROJECT_ROOT, { ENV }),
    readFileAsync(ENTRYPOINT),
    ensureDirAsync(`${PROJECT_ROOT}/tmp/assets`)
  ]).then(async ([buildConfig, htmlBuffer]) => {
    await Promise.all([
      OPTIONS.fastboot ? buildFastbootPackageJSON({
        "assets/application.css": "assets/application.css",
        "assets/vendor.js": "assets/vendor.js",
        "assets/application.js": "assets/application.js",
      }, buildConfig.ENV, 'tmp') : null,
      writeFileAsync(
        `${PROJECT_ROOT}/tmp/index.html`,
        transpileIndexHTML(htmlBuffer.toString(), buildConfig)
      )
    ]);

    startHTTPServer(OPTIONS.environment, OPTIONS.port, { fastboot: OPTIONS.fastboot });

    applicationFilesWatcher(OPTIONS.environment, {
      buildConfig: buildConfig,
      entryPoint: ENTRYPOINT,
      fastboot: OPTIONS.fastboot,
      socketPort: OPTIONS.socketPort,
    });
  }).catch((error) => Console.error(error));
}

// NOTE: if production or demo then buildDist behind the background on each change
