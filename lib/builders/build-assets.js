import fs from 'fs-extra';
import buildIndexHTML from './build-index-html';
import buildCSS from './build-css';
import buildVendor from './build-vendor';
import buildApplication from './build-application';
import buildMemServer from './build-memserver';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

export default function(projectRoot, buildConfig={
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  ENV: {},
  applicationName: null,
  indexHTMLInjections: {},
  runningTests: false,
  entrypoint: null,
  cliArguments: {}
}) {
  return new Promise(async (resolve) => {
    const targetProjectRoot = projectRoot || findProjectRoot();
    const buildCache = buildConfig.buildCache || {
      vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
    };
    const cliArguments = buildConfig.cliArguments || {};
    const entrypoint = buildConfig.entrypoint || `${targetProjectRoot}/index.html`;
    const ENV = buildConfig.ENV || {};
    const environment = ENV.environment || 'development';

    if (!buildConfig.runningTests) {
      await fs.remove(`${targetProjectRoot}/tmp`);
      await fs.mkdir(`${targetProjectRoot}/tmp`);
      await fs.mkdir(`${targetProjectRoot}/tmp/assets`);      
    }

    return Promise.all([
      buildIndexHTML(entrypoint, buildConfig),
      buildCSS(environment),
      buildVendor(ENV, Object.assign({}, cliArguments, {
        fastboot: cliArguments.fastboot !== false,
        hasSocketWatching: cliArguments.watch || !['production', 'demo'].includes(environment),
        vendorPrepends: buildCache.vendorPrepends,
        vendorAppends: buildCache.vendorAppends
      })),
      buildApplication(ENV, {
        applicationPrepends: buildCache.applicationPrepends,
        applicationAppends: buildCache.applicationAppends
      }),
      (ENV.memserver && ENV.memserver.enabled) ? buildMemServer(ENV) : null
    ]).then(() => resolve(buildConfig))
    .catch((error) => reportErrorAndExit(error));
  });
}

function reportErrorAndExit(error)  {
  Console.error('Error occured:', error);
  console.log(error);

  process.exit();
}
