import fs from 'fs-extra';
import { inspect } from 'util';
import chalk from 'ansi-colors';
import Terser from 'terser';
import importAddonFolderToAMD from '../transpilers/import-addon-folder-to-amd.js';
import convertESModuleToAMD from '../transpilers/convert-es-module-to-amd.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import countTime from '../utils/count-time.js';
import say from '../utils/say.js';
import { formatTimePassed, formatSize } from '../utils/asset-reporter.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(
  buildConfig = {
    applicationName: null,
    buildCache: {
      vendorAppends: '',
      vendorPrepends: '',
      applicationAppends: '',
      applicationPrepends: '',
      testPrepends: '',
      testAppends: ''
    },
    cliArguments: null,
    ENV: null,
    indexHTMLInjections: {},
    projectRoot: null
  }
) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');

    const buildCache = buildConfig.buildCache || {};
    const cliArguments = buildConfig.cliArguments || {
      port: 1234,
      fastboot: true,
      socketPort: 65511
    };
    const ENV = buildConfig.ENV || {
      environment: 'development',
      modulePrefix: buildConfig.applicationName || 'frontend'
    };
    const applicationName = ENV.modulePrefix;
    const environment = ENV.environment;
    const projectRoot = buildConfig.projectRoot || (await findProjectRoot());
    const outputPath = `${projectRoot}/tmp/assets/vendor.js`;
    const timer = countTime();

    return readBaseEmber(projectRoot, applicationName, ENV, cliArguments)
      .then((fileContent) => {
        return writeVendorJS(
          outputPath,
          ` ${buildCache.vendorPrepends || ''}
          window.EmberENV = ${inspect(ENV, { depth: null })};
          window.runningTests = !!(window.location && (window.location.pathname === '/tests') && (EmberENV.environment !== 'production'));
          ${fileContent}
          ${cliArguments.socketPort ? addSocketWatch(cliArguments.socketPort) : ''}
          ${buildCache.vendorAppends || ''}
        `,
          environment
        );
      })
      .then(() => {
        const timePassed = timer.stop();

        if (global.HAS_VENDOR_JS_BUILD_ERROR) {
          say.stop();
          say.speak('tests.js is now fixed. Well done');
          global.HAS_VENDOR_JS_BUILD_ERROR = false;
        }

        fs.stat(outputPath).then((stats) => {
          Console.log(
            `${chalk.green('BUILT:')} vendor.js in ${formatTimePassed(timePassed)} [${formatSize(
              stats.size
            )}] Environment: ${environment}`
          );

          resolve({
            message: `BUILT: vendor.js in ${timePassed}ms [${formatSize(
              stats.size
            )}] Environment: ${environment}`,
            stats: stats
          });
        });
      })
      .catch((error) => {
        global.HAS_VENDOR_JS_BUILD_ERROR = true;

        say.stop();
        say.speak('vendor.js build fails. Check your code!');

        Console.error('vendor.js build error:');
        console.log(error);

        reject(error);
      });
  });
}

function readBaseEmber(projectRoot, applicationName, ENV, cliArguments) {
  return new Promise(async (resolve, reject) => {
    const emberBuildPath = `${VENDOR_PATH}/${getEmberVendorBuild(ENV)}`;
    const baseOperations = [
      fs.readFile(emberBuildPath),
      ENV.excludeEmberData
        ? ''
        : importAddonFolderToAMD(applicationName, 'ember-data/app', projectRoot),
      fs.readFile(`${__dirname}/../addons/mber-documentation/index.js`)
    ];

    if (cliArguments.fastboot) {
      return Promise.all(
        baseOperations.concat([
          fs.readFile(`${VENDOR_PATH}/fastboot/fastboot-addon-modules.js`),
          fs.readFile(`${VENDOR_PATH}/fetch/fetch-fastboot-shim.js`),
          ENV.memserver && ENV.memserver.enabled
            ? fs.readFile(`${VENDOR_PATH}/memserver/fastboot/initializers/ajax.js`)
            : fs.readFile(`${VENDOR_PATH}/fastboot/initializers/ajax.js`),
          importAddonFolderToAMD(applicationName, 'ember-cli-fastboot/app', projectRoot)
        ])
      )
        .then(
          async ([
            emberBaseContentCode,
            emberDataAppCode,
            documentationRouterCode,
            appFastbootAddonCode,
            fetchFastbootShimCode,
            fastbootAjaxInitializerCode,
            appFastbootAppCode
          ]) => {
            const AJAX_INITIALIZER_CODE = await convertESModuleToAMD(
              fastbootAjaxInitializerCode.toString(),
              {
                moduleName: `${applicationName}/initializers/ajax`
              }
            );

            return resolve(`
          ${emberBaseContentCode}

          ${documentationRouterCode}

          ${emberDataAppCode || ''}

          ${appFastbootAddonCode}

          if (typeof FastBoot !== 'undefined') {
            ${fetchFastbootShimCode.toString().replace('{{applicationName}}', applicationName)}

            ${AJAX_INITIALIZER_CODE}
          }

          ${appFastbootAppCode}
        `);
          }
        )
        .catch((error) => reject(error));
    }

    return Promise.all(baseOperations).then(
      ([emberBaseContentCode, emberDataAppCode, documentationRouterCode]) => {
        resolve(`
          ${emberBaseContentCode}

          ${documentationRouterCode}

          ${emberDataAppCode || ''}
        `);
      }
    );
  });
}

function getEmberVendorBuild(ENV) {
  const tag = ['production', 'demo'].includes(ENV.environment) ? 'prod' : 'debug';

  if (ENV.excludeEmberData) {
    return `no-ember-data-ember-${tag}.js`;
  }

  return `full-ember-${tag}.js`;
}

function writeVendorJS(path, content, environment) {
  if (['demo', 'production'].includes(environment)) {
    return fs.writeFile(
      path,
      Terser.minify(content, {
        compress: {
          negate_iife: false,
          sequences: 20
        },
        output: {
          semicolons: false
        }
      }).code
    );
  }

  return fs.writeFile(path, content);
}

function addSocketWatch(socketPort) {
  return `
    if (typeof FastBoot === 'undefined') {
      window.socket = new WebSocket('ws://localhost:${socketPort}');

      window.socket.addEventListener('message', function(event) {
        document.querySelectorAll('.ember-view').forEach((e) => e.remove());
        window.location.reload(true);
      });
    }
  `;
}
