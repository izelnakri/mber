import chalk from 'chalk';
import buildDist from '../builders/build-dist';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import setupBuild from '../utils/setup-build';
import startHTTPServer from '../utils/start-http-server';

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;
const APPLICATION_NAME = PROJECT_ROOT.slice(PROJECT_ROOT.lastIndexOf('/') + 1, PROJECT_ROOT.length);

export default async function(defaults={
  watch: false, environment: 'development', fastboot: true, port: 1234, socketPort: 65511
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner('Building application...');

  spinner.stop();

  return setupBuild(PROJECT_ROOT, OPTIONS.environment).then(async (buildConfig) => {
    await buildDist(ENTRYPOINT, APPLICATION_NAME, OPTIONS);

    if (!OPTIONS.watch) {
      process.exit();
    }

    Console.log(`${chalk.green('WATCHING:')}: ${APPLICATION_NAME} files...`);

    const applicationFilesWatcher = require('../utils/application-files-watcher').default;

    startHTTPServer(OPTIONS.environment, OPTIONS.port);
    applicationFilesWatcher(OPTIONS.environment, OPTIONS.socketPort, {
      buildDist: true, entryPoint: ENTRYPOINT, buildConfig: buildConfig
    });
  }).catch((error) => console.log(error));
}
