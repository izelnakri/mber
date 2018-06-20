import fs from 'fs-extra';
import { promisify } from 'util';
import chalk from 'chalk';
import buildDistFolder from '../builders/build-dist-folder';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import fullBuild from '../builders/full-build';
import startHTTPServer from '../runners/start-http-server';

const ensureDirAsync = promisify(fs.ensureDir);

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;

export default async function(defaults={
  watch: false, environment: 'development', fastboot: true, port: 1234, socketPort: 65511
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner('Building application...');

  spinner.stop();

  return Promise.all([
    fullBuild(PROJECT_ROOT, OPTIONS.environment),
    ensureDirAsync(`${PROJECT_ROOT}/tmp/assets`)
  ]).then(async ([buildConfig]) => {
    await buildDistFolder(ENTRYPOINT, buildConfig, OPTIONS);

    if (!OPTIONS.watch) {
      process.exit();
    }

    Console.log(`${chalk.green('WATCHING:')}: ${buildConfig.applicationName} files...`);

    const applicationFilesWatcher = require('../runners/application-files-watcher').default;

    startHTTPServer(OPTIONS.environment, OPTIONS.port, { buildMode: true, fastboot: OPTIONS.fastboot });
    applicationFilesWatcher(OPTIONS.environment, {
      buildDist: true,
      entryPoint: ENTRYPOINT,
      buildConfig: buildConfig,
      fastboot: OPTIONS.fastboot,
      socketPort: OPTIONS.socketPort
    });
  }).catch((error) => console.log(error));
}
