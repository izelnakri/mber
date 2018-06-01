import applicationFilesWatcher from '../utils/application-files-watcher';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildVendor from '../builders/build-vendor';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import startHTTPServer from '../utils/start-http-server';

const ENTRYPOINT = `${findProjectRoot()}/index.html`;

export default async function(defaults={ port: 1234, environment: 'development', fastboot: true }) {
  const ARGUMENTS = Object.assign(defaults, parseCLIArguments());
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  let spinner = Console.spinner(`building development server... [Environment: ${ENVIRONMENT}]`);

  spinner.stop();

  return Promise.all([
    buildCSS(ENVIRONMENT),
    buildVendor(ENVIRONMENT, { watching: true }),
    buildApplication(ENVIRONMENT)
  ]).then(() => {
    const PORT = ARGUMENTS.port || defaults.port;
    const SOCKET_PORT = ARGUMENTS.socketPort || defaults.socketPort;

    startHTTPServer(ENVIRONMENT, PORT);
    applicationFilesWatcher(ENVIRONMENT, SOCKET_PORT, { entryPoint: ENTRYPOINT });
  }).catch((error) => console.log(error));
}

// NOTE: if production or demo then buildDist behind the background on each change
