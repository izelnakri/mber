import Bundler from 'parcel-bundler';
import applicationFilesWatcher from '../utils/application-files-watcher';
import buildApplication from '../utils/build-application';
import buildVendor from '../utils/build-vendor';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';

const server = require('express')();
const projectRoot = findProjectRoot();
// const applicationName = projectRoot.slice(projectRoot.lastIndexOf('/') + 1, projectRoot.length);

export default async function(defaults={ port: 1234, environment: 'development', fastboot: true }) {
  let spinner = Console.spinner('building development server...');

  const args = Object.assign(defaults, parseCLIArguments());
  const entrypoint = `${projectRoot}/index.html`;
  const environment = args.environment || defaults.environment;

  spinner.stop();

  return Promise.all([
    buildVendor(environment),
    buildApplication(environment)
  ]).then(async () => {
    // let spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${applicationName}...`); // TODO: maybe add instrumentation again
    //
    // const timer = countTime();
    const bundler = new Bundler(entrypoint, { file: entrypoint, hmrPort: 65511 }); // TODO: change log level, make this not compile
    //
    // await bundler.bundle();
    //
    // spinner.stop();
    //
    // const timeSpent = `${timer.stop()}ms`;
    //
    // Console.log(`${chalk.green('BUNDLED')}: ${applicationName} in ${chalk.yellow(timeSpent)}`);

    server.use(bundler.middleware());
    server.listen(defaults.port);

    Console.log(`Server is running on http://localhost:${defaults.port} (Environment: ${environment})\n`);

    applicationFilesWatcher(environment, bundler);
    // TODO: watch directories
  }).catch((error) => console.log(error));
}



// import findIndexHTML from '../utils/find-index-html';

// const app = require('express')();
//
// export default function() {
//   const PORT = 4200; // TODO: make this dynamic
//   const entrypoint = findIndexHTML();
//   const bundler = new Bundler(entrypoint, {});
//
//   app.use(bundler.middleware());
//   app.listen(PORT);
//
//   console.log(`[mber] mber server is running on http://localhost:${PORT}`);
// }
