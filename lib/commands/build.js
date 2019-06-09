import os from 'os';
import WorkerPool from '../worker-pool/index.js';
import buildDistFolder from '../builders/build-dist-folder.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import parseCLIArguments from '../utils/parse-cli-arguments.js';
import startBuilder from '../runners/start-builder.js';

export default async function(defaults={
  environment: 'development', fastboot: true, port: 1234, socketPort: 65511, testing: true, talk: true
}) {
  const spinner = Console.spinner('Building application...\n');

  global.MBER_DISABLE_SOCKETS = true;

  const PROJECT_ROOT = await findProjectRoot();
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());
  const ENV = (await import(`${PROJECT_ROOT}/config/environment.js`)).default(OPTIONS.environment);

  spinner.stop();

  return startBuilder(PROJECT_ROOT, ENV).then(async (buildConfig) => {
    await buildDistFolder(buildConfig);

    setTimeout(() => process.exit(), 100);
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
