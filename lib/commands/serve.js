import Bundler from 'parcel-bundler';
import applicationFilesWatcher from '../utils/application-files-watcher';
import buildApplication from '../utils/build-application';
import buildCSS from '../utils/build-css';
import buildVendor from '../utils/build-vendor';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';

const server = require('express')();
const projectRoot = findProjectRoot();
// const applicationName = projectRoot.slice(projectRoot.lastIndexOf('/') + 1, projectRoot.length);

export default async function(defaults={ port: 1234, environment: 'development', fastboot: true }) {
  let spinner = Console.spinner(`building development server... [Environment: ${environment}]`);

  const args = Object.assign(defaults, parseCLIArguments());
  const entrypoint = `${projectRoot}/index.html`;
  const environment = args.environment || defaults.environment;

  spinner.stop();

  return Promise.all([
    buildCSS(environment),
    buildVendor(environment, { watching: true }),
    buildApplication(environment)
  ]).then(async () => {
    const bundler = new Bundler(entrypoint, { file: entrypoint, hmrPort: 65511 }); // TODO: change log level, make this not compile

    server.use(bundler.middleware());
    server.listen(defaults.port);

    Console.log(`Server is running on http://localhost:${defaults.port} (Environment: ${environment})\n`);

    applicationFilesWatcher(environment);
  }).catch((error) => console.log(error));
}
