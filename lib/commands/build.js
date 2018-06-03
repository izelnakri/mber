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
  const ARGUMENTS = parseCLIArguments();
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  let spinner = Console.spinner('building application...');

  spinner.stop();

  return setupBuild(PROJECT_ROOT, ENVIRONMENT).then(async (buildConfig) => {
    await buildDist(ENTRYPOINT, APPLICATION_NAME);

    if (!ARGUMENTS.watch || defaults.watch) {
      process.exit();
    }

    Console.log(`${chalk.green('WATCHING')}: ${APPLICATION_NAME} files...`);

    const PORT = ARGUMENTS.port || defaults.port;
    const SOCKET_PORT = ARGUMENTS.socketPort || defaults.socketPort;
    const applicationFilesWatcher = require('../utils/application-files-watcher').default;

    startHTTPServer(ENVIRONMENT, PORT);
    applicationFilesWatcher(ENVIRONMENT, SOCKET_PORT, {
      buildDist: true, entryPoint: ENTRYPOINT, buildConfig: buildConfig
    });
  }).catch((error) => console.log(error));
}
