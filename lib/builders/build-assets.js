import fs from 'fs-extra';
import buildIndexHTML from './build-index-html';
import buildCSS from './build-css';
import buildVendor from './build-vendor';
import buildApplication from './build-application';
import buildDocumentation from './build-documentation';
import buildDocumentationCSS from './build-documentation-css';
import buildDocumentationHTML from './build-documentation-html';
import buildMemServer from './build-memserver';
import buildTests from './build-tests';
import buildFastbootPackageJSON from './build-fastboot-package-json';
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
}, lint=true) {
  return new Promise(async (resolve) => {
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const cliArguments = buildConfig.cliArguments || {};
    const ENV = buildConfig.ENV || {
      environment: 'development', modulePrefix: buildConfig.applicationName || 'frontend'
    };

    if (!cliArguments.testing) {
      await fs.remove(`${projectRoot}/tmp`);
    }

    await fs.mkdirp(`${projectRoot}/tmp/assets`);

    const memserverIsEnabled = ENV.memserver && ENV.memserver.enabled;
    const documentationIsEnabled = ENV.documentation && ENV.documentation.enabled;
    const defaultAssetMap = {
      "assets/application.css": "assets/application.css",
      "assets/vendor.js": "assets/vendor.js",
      "assets/application.js": "assets/application.js",
    };

    return Promise.all([
      buildIndexHTML(`${projectRoot}/index.html`, buildConfig),
      buildCSS(buildConfig),
      buildVendor(buildConfig),
      buildApplication(buildConfig, lint),
      memserverIsEnabled ? buildFastbootPackageJSON(Object.assign(defaultAssetMap, {
        "assets/memserver.js": "assets/memserver.js"
      }), buildConfig, 'tmp') : buildFastbootPackageJSON(defaultAssetMap, buildConfig, 'tmp'),
      memserverIsEnabled ? buildMemServer(buildConfig, lint) : null,
      documentationIsEnabled ? buildDocumentation(buildConfig, lint) : null,
      documentationIsEnabled ? buildDocumentationCSS(buildConfig) : null,
      documentationIsEnabled ? buildDocumentationHTML(`${projectRoot}/index.html`, buildConfig) : null,
      cliArguments.testing ? buildIndexHTML(`${projectRoot}/tests/index.html`, buildConfig) : null,
      cliArguments.testing ? buildTests(buildConfig, lint) : null,
      cliArguments.testing ? fs.copy(`${VENDOR_PATH}/test-support.css`, `${projectRoot}/tmp/assets/test-support.css`) : null,
      cliArguments.testing ? fs.copy(`${VENDOR_PATH}/test-support.js`, `${projectRoot}/tmp/assets/test-support.js`) : null
    ]).then(() => resolve(buildConfig))
    .catch((error) => reportErrorAndExit(error));
  });
}

function reportErrorAndExit(error)  {
  Console.log('Error occured!');
  console.log(error);

  setTimeout(() => process.exit(1), 100);
}
