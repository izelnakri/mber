// TODO: not finished
import fs from 'fs-extra';
import { inspect } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-es';
import importAddonFolderToAMD from '../transpilers/import-addon-folder-to-amd';
import convertESModuleToAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import countTime from '../utils/count-time';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: null,
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null
}) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');

    const BUILD_CACHE = buildConfig.buildCache || {};
    const CLI_ARGUMENTS = buildConfig.cliArguments || {
      port: 1234, fastboot: true, socketPort: 65511
    };
    const ENV = buildConfig.ENV || {
      environment: 'development',
      modulePrefix: buildConfig.applicationName || 'frontend'
    };
    const APPLICATION_NAME = ENV.modulePrefix;
    const environment = ENV.environment;
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/vendor.js`;
    const timer = countTime();

    return readBaseEmber(PROJECT_ROOT, APPLICATION_NAME, ENV, CLI_ARGUMENTS).then((fileContent) => {
      return writeVendorJS(
        OUTPUT_PATH,
        ` ${BUILD_CACHE.vendorPrepends || ''}
          window.EmberENV = ${inspect(ENV, { depth: null })};
          window.runningTests = !!(window.MBER_TEST_RUNNER && (EmberENV.environment !== 'production'));
          ${fileContent}
          ${CLI_ARGUMENTS.socketPort ? addSocketWatch(CLI_ARGUMENTS.socketPort) : ''}
          ${BUILD_CACHE.vendorAppends || ''}
        `,
        environment
      );
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_VENDOR_JS_BUILD_ERROR) {
        say.stop();
        say.speak('tests.js is now fixed. Well done');
        global.HAS_VENDOR_JS_BUILD_ERROR = false;
      }

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} vendor.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: vendor.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    }).catch((error) => {
      global.HAS_VENDOR_JS_BUILD_ERROR = true;

      say.stop();
      say.speak('vendor.js build fails. Check your code!');

      Console.error('vendor.js build error:');
      console.log(error);

      reject(error);
    });
  });
}

function readBaseEmber(projectRoot, APPLICATION_NAME, ENV, cliArguments) {
  return new Promise((resolve, reject) => {
    const emberBuildPath = `${VENDOR_PATH}/${getEmberVendorBuild(ENV)}`;
    const baseOperations = [
      fs.readFile(emberBuildPath),
      ENV.excludeEmberData ? '' : importAddonFolderToAMD(APPLICATION_NAME, 'ember-data/app', projectRoot),
    ];

    if (cliArguments.fastboot) {
      return Promise.all(baseOperations.concat([
        fs.readFile(`${VENDOR_PATH}/fastboot/fastboot-addon-modules.js`),
        ENV.memserver && ENV.memserver.enabled ?
          fs.readFile(`${VENDOR_PATH}/memserver/fastboot/initializers/ajax.js`) :
          fs.readFile(`${VENDOR_PATH}/fastboot/initializers/ajax.js`),
        fs.readFile(`${VENDOR_PATH}/fastboot/initializers/error-handler.js`),
        importAddonFolderToAMD(APPLICATION_NAME, 'ember-cli-fastboot/app', projectRoot)
      ])).then(([
        emberBaseContentCode, emberDataAppCode, appFastbootAddonCode,
        fastbootAjaxInitializerCode, fastbootErrorHandlerInitializerCode,
        appFastbootAppCode
      ]) => {
        const AJAX_INITIALIZER_CODE = convertESModuleToAMD(fastbootAjaxInitializerCode.toString(), {
          moduleName: `${APPLICATION_NAME}/initializers/ajax`
        });
        const ERROR_HANDLER_INITIALIZER_CODE = convertESModuleToAMD(fastbootErrorHandlerInitializerCode.toString(), {
          moduleName: `${APPLICATION_NAME}/initializers/error-handler`
        });

        return resolve(`
          ${emberBaseContentCode}

          ${emberDataAppCode || ''}

          ${appFastbootAddonCode}

          if (typeof FastBoot !== 'undefined') {
            ${AJAX_INITIALIZER_CODE}

            ${ERROR_HANDLER_INITIALIZER_CODE}
          }

          ${appFastbootAppCode}
        `);
      }).catch((error) => reject(error));
    }

    return Promise.all(baseOperations).then(([emberBaseContentCode, emberDataAppCode]) => {
      resolve(`
        ${emberBaseContentCode}

        ${emberDataAppCode || ''}
      `);
    });
  });
}

function getEmberVendorBuild(ENV) {
  const tag = ENV.environment === 'production' ? 'prod' : 'debug';

  if (ENV.excludeEmberData) {
    return `no-ember-data-ember-${tag}.js`;
  }

  return `full-ember-${tag}.js`;
}

function writeVendorJS(path, content, environment) {
  if (['demo', 'production'].includes(environment)) {
    return fs.writeFile(path, UglifyJS.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
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
