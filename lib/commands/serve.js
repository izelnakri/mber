// import Bundler from 'parcel-bundler';
import applicationFilesWatcher from '../utils/application-files-watcher';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildVendor from '../builders/build-vendor';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import parseCLIArguments from '../utils/parse-cli-arguments';

const server = require('express')();
const ENTRYPOINT = `${findProjectRoot()}/index.html`;
// const applicationName = projectRoot.slice(projectRoot.lastIndexOf('/') + 1, projectRoot.length);

export default async function(defaults={ port: 1234, environment: 'development', fastboot: true }) {
  const ARGUMENTS = Object.assign(defaults, parseCLIArguments());
  const ENVIRONMENT = ARGUMENTS.environment || defaults.environment;

  let spinner = Console.spinner(`building development server... [Environment: ${ENVIRONMENT}]`);

  spinner.stop();

  return Promise.all([
    buildCSS(ENVIRONMENT),
    buildVendor(ENVIRONMENT, { watching: true }),
    buildApplication(ENVIRONMENT)
  ]).then(() => {
    // const bundler = new Bundler(ENTRYPOINT, { file: ENTRYPOINT, hmrPort: 65511 }); // TODO: change log level, make this not compile
    const PORT = ARGUMENTS.port || defaults.port;

    // server.use(bundler.middleware());
    server.listen(PORT);

    Console.log(`Server is running on http://localhost:${PORT} (Environment: ${ENVIRONMENT})\n`);

    applicationFilesWatcher(ENVIRONMENT);
  }).catch((error) => console.log(error));
}


// NOTE: if production or demo then buildDist behind the background on each change
