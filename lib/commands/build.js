import chalk from 'chalk';
import Bundler from 'parcel-bundler';
import buildApplication from '../utils/build-application';
import buildVendor from '../utils/build-vendor';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';

export default async function(options={ watch: false }) {
  let spinner = Console.spinner('building application...');

  const projectRoot = findProjectRoot();
  const entrypoint = `${projectRoot}/index.html`;
  const applicationName = projectRoot.slice(projectRoot.lastIndexOf('/') + 1, projectRoot.length);

  spinner.stop();

  // TODO: make buildVendor and buildApplication parallel
  buildVendor()
    .then(() => buildApplication())
    .then(async function () {
      let spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${applicationName}...`);

      const timer = countTime();
      const bundler = new Bundler(entrypoint, { file: entrypoint, logLevel: 2 });

      await bundler.bundle();

      spinner.stop();

      const timeSpent = `${timer.stop()}ms`;

      Console.log(`${chalk.green('BUNDLED')}: ${applicationName} in ${chalk.yellow(timeSpent)}`);

      if (!options.watch) {
        process.exit();
      }
    });
}
