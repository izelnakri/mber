import chalk from 'chalk';
import buildDistFolder from '../builders/build-dist-folder';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import startBuilder from '../runners/start-builder';
import startHTTPServer from '../runners/start-http-server';

export default async function(defaults={
  watch: false, environment: 'development', fastboot: true, port: 1234, socketPort: 65511
}) {
  const PROJECT_ROOT = findProjectRoot();
  const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;

  let spinner = Console.spinner('Building application...');

  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

  spinner.stop();

  return startBuilder({
    ENV: ENV,
    projectRoot: PROJECT_ROOT,
    entrypoint: ENTRYPOINT
  }).then(async (buildConfig) => {
    await buildDistFolder(ENTRYPOINT, buildConfig, OPTIONS);

    if (!OPTIONS.watch) {
      process.exit();
    }

    Console.log(`${chalk.green('WATCHING:')}: ${buildConfig.applicationName} files...`);

    const applicationFilesWatcher = require('../runners/application-files-watcher').default;

    startHTTPServer(OPTIONS.environment, ENV, {
      buildMode: true, fastboot: OPTIONS.fastboot, port: OPTIONS.port
    });
    applicationFilesWatcher(OPTIONS.environment, {
      buildDist: true,
      entryPoint: ENTRYPOINT,
      buildConfig: buildConfig,
      fastboot: OPTIONS.fastboot,
      socketPort: OPTIONS.socketPort
    });
  }).catch((error) => console.log(error));
}
