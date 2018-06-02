import chalk from 'chalk';
import buildDist from '../builders/build-dist';
import buildApplication from '../builders/build-application';
import buildVendor from '../builders/build-vendor';
import buildCSS from '../builders/build-css';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import startHTTPServer from '../utils/start-http-server';

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;
const APPLICATION_NAME = PROJECT_ROOT.slice(PROJECT_ROOT.lastIndexOf('/') + 1, PROJECT_ROOT.length);

export default async function(buildConfig={}, defaults={
  watch: false, environment: 'development', fastboot: true, port: 1234, socketPort: 65511
}) {
  let spinner = Console.spinner('building application...');

  const ARGUMENTS = Object.assign(defaults, parseCLIArguments());
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  spinner.stop();

  return Promise.all([
    buildCSS(ENVIRONMENT),
    buildVendor(ENVIRONMENT, { watching: ARGUMENTS.watch }),
    buildApplication(ENVIRONMENT),
  ]).then(async () => {
    await buildDist(ENTRYPOINT, APPLICATION_NAME);

    if (!ARGUMENTS.watch) {
      process.exit();
    }

    Console.log(`${chalk.green('WATCHING')}: ${APPLICATION_NAME} files...`);

    const PORT = ARGUMENTS.port || defaults.port;
    const SOCKET_PORT = ARGUMENTS.socketPort || defaults.socketPort;
    const applicationFilesWatcher = require('../utils/application-files-watcher').default;

    startHTTPServer(ENVIRONMENT, PORT);
    applicationFilesWatcher(ENVIRONMENT, SOCKET_PORT, { buildDist: true, entryPoint: ENTRYPOINT });
  }).catch((error) => console.log(error));
}
