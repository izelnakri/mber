import fs from 'fs-extra';
import buildIndexHTML from './build-index-html';
import buildCSS from './build-css';
import buildVendor from './build-vendor';
import buildApplication from './build-application';
import buildMemServer from './build-memserver';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: {},
  ENV: {},
  indexHTMLInjections: {},
  projectRoot: null,
  testing: false
}) {
  return new Promise(async (resolve) => {
    const targetProjectRoot = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || {};

    if (!buildConfig.runningTests) {
      await fs.remove(`${targetProjectRoot}/tmp`);
      await fs.mkdirp(`${targetProjectRoot}/tmp/assets`);
    }

    return Promise.all([
      buildIndexHTML(buildConfig),
      buildCSS(buildConfig),
      buildVendor(buildConfig),
      buildApplication(buildConfig),
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
