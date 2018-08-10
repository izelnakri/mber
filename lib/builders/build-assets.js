import fs from 'fs-extra';
import buildIndexHTML from './build-index-html';
import buildCSS from './build-css';
import buildVendor from './build-vendor';
import buildApplication from './build-application';
import buildMemServer from './build-memserver';
import buildTests from './build-tests';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: null,
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null,
}) {
  return new Promise(async (resolve) => {
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const CLI_ARGUMENTS = buildConfig.cliArguments || {};
    const ENV = buildConfig.ENV || {
      environment: 'development', modulePrefix: buildConfig.applicationName || 'frontend'
    };

    if (!CLI_ARGUMENTS.testing) {
      await fs.remove(`${projectRoot}/tmp`);
      await fs.mkdirp(`${projectRoot}/tmp/assets`);
    }

    return Promise.all([
      buildIndexHTML(`${projectRoot}/index.html`, buildConfig),
      buildIndexHTML(`${projectRoot}/tests/index.html`, buildConfig),
      buildCSS(buildConfig),
      buildVendor(buildConfig),
      buildApplication(buildConfig),
      CLI_ARGUMENTS.testing ? buildTests(buildConfig) : null,
      CLI_ARGUMENTS.testing ? fs.copy(`${VENDOR_PATH}/test-support.css`, `${projectRoot}/tmp/assets/test-support.css`) : null,
      CLI_ARGUMENTS.testing ? fs.copy(`${VENDOR_PATH}/test-support.js`, `${projectRoot}/tmp/assets/test-support.js`) : null,
      (ENV.memserver && ENV.memserver.enabled) ? buildMemServer(buildConfig) : null
    ]).then(() => resolve(buildConfig))
    .catch((error) => reportErrorAndExit(error));
  });
}

function reportErrorAndExit(error)  {
  Console.error('Error occured:', error);
  console.log(error);

  process.exit();
}
