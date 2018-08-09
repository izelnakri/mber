import buildDistFolder from '../builders/build-dist-folder';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import startBuilder from '../runners/start-builder';

export default async function(defaults={
  environment: 'development', fastboot: true, port: 1234, socketPort: 65511
}) {
  let spinner = Console.spinner('Building application...');

  const PROJECT_ROOT = await findProjectRoot();
  const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

  spinner.stop();

  return startBuilder(PROJECT_ROOT, ENV).then(async (buildConfig) => {
    await buildDistFolder(ENTRYPOINT, buildConfig, OPTIONS);

    process.exit();
    // if (!OPTIONS.watch) {
    //   process.exit();
    // }
    //
    // Console.log(`${chalk.green('WATCHING:')}: ${buildConfig.applicationName} files...`);
    //
    // const applicationFilesWatcher = require('../runners/application-files-watcher').default;
    //
    // startHTTPServer({
    //   buildMode: true, fastboot: OPTIONS.fastboot, port: OPTIONS.port
    // });
    // applicationFilesWatcher({
    //   buildDist: true,
    //   entryPoint: ENTRYPOINT,
    //   buildConfig: buildConfig,
    //   fastboot: OPTIONS.fastboot,
    //   socketPort: OPTIONS.socketPort
    // });
  }).catch((error) => console.log(error));
}
