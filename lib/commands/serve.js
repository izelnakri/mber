import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import applicationFilesWatcher from '../runners/application-files-watcher';
import startBuilder from '../runners/start-builder';
import startHTTPServer from '../runners/start-http-server';

export default async function(defaults={
  environment: 'development', fastboot: true, port: 1234, socketPort: 65511, talk: true
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  let spinner = Console.spinner(`Building development server... [Environment: ${OPTIONS.environment}]`);

  const PROJECT_ROOT = await findProjectRoot();
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

  spinner.stop();

  return startBuilder(PROJECT_ROOT, ENV).then(async (buildConfig) => {
    startHTTPServer(buildConfig);

    if (OPTIONS.watch !== false) {
      applicationFilesWatcher(buildConfig);
    }
  }).catch((error) => Console.error(error));
}

// NOTE: if production or demo then buildDist behind the background on each change
