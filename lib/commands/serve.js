import buildFastbootPackageJSON from '../builders/build-fastboot-package-json';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import applicationFilesWatcher from '../runners/application-files-watcher';
import startBuilder from '../runners/start-builder';
import startHTTPServer from '../runners/start-http-server';

export default async function(defaults={
  environment: 'development', fastboot: true, port: 1234, socketPort: 65511
}) {
  let spinner = Console.spinner(`Building development server... [Environment: ${OPTIONS.environment}]`);

  const PROJECT_ROOT = await findProjectRoot();
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

  spinner.stop();

  return startBuilder(PROJECT_ROOT, ENV).then(async (buildConfig) => {
    OPTIONS.fastboot ? await buildFastbootMetaFile(ENV) : null;

    startHTTPServer(ENV, { fastboot: OPTIONS.fastboot, port: OPTIONS.port });

    if (OPTIONS.watch !== false) {
      applicationFilesWatcher(buildConfig);
    }
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
