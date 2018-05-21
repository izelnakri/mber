import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util'
import chalk from 'chalk';
import rimraf from 'rimraf';
import Bundler from 'parcel-bundler';
import buildApplication from '../utils/build-application';
import buildVendor from '../utils/build-vendor';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';
import { formatSize } from '../utils/asset-reporter';

const rmdirAsync = promisify(rimraf);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const gzipAsync = promisify(zlib.gzip);
const projectRoot = findProjectRoot();

export default async function(defaults={ watch: false, environment: 'development' }) {
  let spinner = Console.spinner('building application...');

  const args = Object.assign(defaults, parseCLIArguments());
  const applicationName = projectRoot.slice(projectRoot.lastIndexOf('/') + 1, projectRoot.length);
  const entrypoint = `${projectRoot}/index.html`;
  const outputDir = `${projectRoot}/dist`;

  spinner.stop();

  return Promise.all([
    buildVendor(args.environment),
    buildApplication(args.environment),
    resetDistFolder(),
  ]).then(async () => {
    let spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${applicationName}...`);

    const timer = countTime();
    const bundler = new Bundler(entrypoint, { file: entrypoint, logLevel: 2 });

    await bundler.bundle();

    spinner.stop();

    const timeSpent = `${timer.stop()}ms`;

    Console.log(`${chalk.green('BUNDLED')}: ${applicationName} in ${chalk.yellow(timeSpent)}`);

    await reportAssets();

    if (!args.watch) {
      process.exit();
    }
  }).catch((error) => console.log(error));

  function resetDistFolder() {
    return new Promise((resolve, reject) => {
      rmdirAsync(outputDir).then(() => mkdirAsync(outputDir))
        .then(() => resolve())
        .catch((error) => reject(error));
    })
  }

  async function reportAssets() {
    return new Promise(async (resolve) => {
      const outputDirectory = outputDir.slice(projectRoot.length + 1);

      console.log(chalk.green(`Built project successfully. Stored in "./${outputDirectory}":`));

      const dist = await readdirAsync(outputDir);

      return Promise.all(
        dist.filter((file) => file.endsWith('.js') || file.endsWith('.css'))
          .map((fileName) => {
            return new Promise(async (resolve) => {
              const fileBuffer = await readFileAsync(`${outputDir}/${fileName}`);

              return gzipAsync(fileBuffer).then((gzipBuffer) => {
                console.log(
                  chalk.blue(` - ./${outputDirectory}/${fileName}:`),
                  chalk.yellow(formatSize(fileBuffer.length)),
                  chalk.green(`[${formatSize(gzipBuffer.length)}]`)
                );
                resolve();
              }).catch((error) => console.log('error', error));
            });
          })
      ).then(() => resolve());
    });
  }
}
