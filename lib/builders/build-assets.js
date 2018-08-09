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
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null,
  testing: false
}) {
  return new Promise(async (resolve) => {
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || {
      environment: 'development', modulePrefix: buildConfig.applicationName || 'frontend'
    };
    const ENTRYPOINT = global.MBER_TEST_RUNNER ? `${projectRoot}/tests/index.html` :
      `${projectRoot}/index.html`;

    if (!buildConfig.testing) {
      await fs.remove(`${projectRoot}/tmp`);
      await fs.mkdirp(`${projectRoot}/tmp/assets`);
    }

    return Promise.all([
      buildIndexHTML(ENTRYPOINT, buildConfig),
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
