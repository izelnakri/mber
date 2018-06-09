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
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner(`Building development server... [Environment: ${OPTIONS.environment}]`);

  spinner.stop();

  return setupBuild(PROJECT_ROOT, OPTIONS.environment).then((buildConfig) => {

    startHTTPServer(OPTIONS.environment, OPTIONS.port);
    applicationFilesWatcher(OPTIONS.environment, OPTIONS.socketPort, {
      entryPoint: ENTRYPOINT, buildConfig: buildConfig
    });
  }).catch((error) => Console.error(error));
}

// NOTE: if production or demo then buildDist behind the background on each change
