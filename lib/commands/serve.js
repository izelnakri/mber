import applicationFilesWatcher from '../utils/application-files-watcher';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import setupBuild from '../builders/setup-build';
import startHTTPServer from '../utils/start-http-server';

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;

export default async function(defaults={
  port: 1234, environment: 'development', fastboot: true, socketPort: 65511
}) {
  const ARGUMENTS = parseCLIArguments();
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  let spinner = Console.spinner(`building development server... [Environment: ${ENVIRONMENT}]`);

  spinner.stop();

  console.log('call setupBuild');
  
  return setupBuild(PROJECT_ROOT, ENVIRONMENT).then((buildConfig) => {
    console.log('buildConfig is', buildConfig);
    const PORT = ARGUMENTS.port || defaults.port;
    const SOCKET_PORT = ARGUMENTS.socketPort || defaults.socketPort;

    startHTTPServer(ENVIRONMENT, PORT);
    applicationFilesWatcher(ENVIRONMENT, SOCKET_PORT, {
      entryPoint: ENTRYPOINT, buildConfig: buildConfig
    });
  }).catch((error) => console.log(error));
}

// NOTE: if production or demo then buildDist behind the background on each change
