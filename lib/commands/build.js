import fs from 'fs';
import { promisify } from 'util'
import chalk from 'chalk';
import rimraf from 'rimraf';
import Bundler from 'parcel-bundler';
import buildApplication from '../utils/build-application';
import buildVendor from '../utils/build-vendor';
import buildCSS from '../utils/build-css';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import { reportFile } from '../utils/asset-reporter';

const rmdirAsync = promisify(rimraf);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);

const PROJECT_ROOT = findProjectRoot();
const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;
const OUTPUT_DIRECTORY = `${PROJECT_ROOT}/dist`;
const APPLICATION_NAME = PROJECT_ROOT.slice(PROJECT_ROOT.lastIndexOf('/') + 1, PROJECT_ROOT.length);

export default async function(defaults={
  watch: false, environment: 'development', fastboot: true, port: 1234
}) {
  let spinner = Console.spinner('building application...');

  const ARGUMENTS = Object.assign(defaults, parseCLIArguments());
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  spinner.stop();

  return Promise.all([
    buildCSS(ENVIRONMENT),
    buildVendor(ENVIRONMENT, { watching: ARGUMENTS.watch }),
    buildApplication(ENVIRONMENT),
    resetDistFolder(),
  ]).then(async () => {
    let spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${APPLICATION_NAME}...`);

    const timer = countTime();
    const bundler = new Bundler(ENTRYPOINT, { file: ENTRYPOINT, logLevel: 2, hmrPort: 65511 });

    await bundler.bundle();

    spinner.stop();

    const TIME_SPENT = `${timer.stop()}ms`;

    Console.log(`${chalk.green('BUNDLED')}: ${APPLICATION_NAME} in ${chalk.yellow(TIME_SPENT)}`);

    await reportAssets();

    if (!ARGUMENTS.watch) {
      process.exit();
    }

    Console.log(`${chalk.green('WATCHING')}: ${APPLICATION_NAME} files...`);

    const PORT = ARGUMENTS.port || defaults.port;
    const server = require('express')();
    const applicationFilesWatcher = require('../utils/application-files-watcher').default;

    server.use(bundler.middleware());
    server.listen(PORT);

    Console.log(`Server is running on http://localhost:${PORT} (Environment: ${ENVIRONMENT})\n`);

    applicationFilesWatcher(ENVIRONMENT);
  }).catch((error) => console.log(error));

  function resetDistFolder() {
    return new Promise((resolve, reject) => {
      rmdirAsync(OUTPUT_DIRECTORY).then(() => mkdirAsync(OUTPUT_DIRECTORY))
        .then(() => resolve())
        .catch((error) => reject(error));
    })
  }

  async function reportAssets() {
    return new Promise(async (resolve) => {
      const outputDirectory = OUTPUT_DIRECTORY.slice(PROJECT_ROOT.length + 1);

      console.log(chalk.green(`Built project successfully. Stored in "./${outputDirectory}":`));

      const dist = await readdirAsync(OUTPUT_DIRECTORY);

      return Promise.all(
        dist.filter((file) => file.endsWith('.js') || file.endsWith('.css'))
          .map((fileName) => reportFile(`${outputDirectory}/${fileName}`))
      ).then(() => resolve())
    });
  }
}
