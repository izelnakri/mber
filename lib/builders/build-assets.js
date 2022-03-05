import fs from 'fs/promises';
import buildIndexHTML from './build-index-html.js';
import buildCSS from './build-css.js';
import buildVendor from './build-vendor.js';
import buildApplication from './build-application.js';
import buildDocumentation from './build-documentation.js';
import buildDocumentationCSS from './build-documentation-css.js';
import buildDocumentationHTML from './build-documentation-html.js';
import buildMemServer from './build-memserver.js';
import buildTests from './build-tests.js';
import buildFastbootPackageJSON from './build-fastboot-package-json.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
      await fs.rm(`${projectRoot}/tmp`, { recursive: true, force: true });
    }

    await fs.mkdir(`${projectRoot}/tmp/assets`, { recursive: true });

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
      cliArguments.testing ? fs.copyFile(`${VENDOR_PATH}/test-support.css`, `${projectRoot}/tmp/assets/test-support.css`) : null,
      cliArguments.testing ? fs.copyFile(`${VENDOR_PATH}/test-support.js`, `${projectRoot}/tmp/assets/test-support.js`) : null
    ]).then(() => resolve(buildConfig))
    .catch((error) => reportErrorAndExit(error));
  });
}

function reportErrorAndExit(error)  {
  Console.log('Error occured!');
  console.log(error);

  setTimeout(() => process.exit(1), 100);
}
