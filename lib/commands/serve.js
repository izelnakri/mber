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
    readFileAsync(ENTRYPOINT), // TODO: do this in fullBuild
    ensureDirAsync(`${PROJECT_ROOT}/tmp/assets`)
  ]).then(async ([buildConfig, htmlBuffer]) => {
    await Promise.all([
      OPTIONS.fastboot ? buildFastbootMetaFile(ENV) : null,
      writeFileAsync(
        `${PROJECT_ROOT}/tmp/index.html`,
        transpileIndexHTML(htmlBuffer.toString(), ENV, buildConfig)
      )
    ]);

    startHTTPServer(OPTIONS.environment, ENV, { fastboot: OPTIONS.fastboot, port: OPTIONS.port });

    applicationFilesWatcher(OPTIONS.environment, {
      buildConfig: buildConfig,
      entryPoint: ENTRYPOINT,
      fastboot: OPTIONS.fastboot,
      socketPort: OPTIONS.socketPort,
    });
  }).catch((error) => Console.error(error));
}

function buildFastbootMetaFile(ENV) {
  const MEMSERVER_IS_ENABLED = ENV.memserver && ENV.memserver.enabled;
  const defaultAssetMap = {
    "assets/application.css": "assets/application.css",
    "assets/vendor.js": "assets/vendor.js",
    "assets/application.js": "assets/application.js",
  };

  if (MEMSERVER_IS_ENABLED) {
    return buildFastbootPackageJSON(Object.assign(defaultAssetMap, {
      "assets/memserver.js": "assets/memserver.js"
    }), ENV, 'tmp');
  }

  return buildFastbootPackageJSON(defaultAssetMap, ENV, 'tmp');
}

// NOTE: if production or demo then buildDist behind the background on each change
