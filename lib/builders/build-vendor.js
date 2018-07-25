import fs from 'fs-extra';
import { inspect } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-es';
import importAddonFolderToAMD from '../transpilers/import-addon-folder-to-amd';
import convertESModuleToAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import countTime from '../utils/count-time';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const VENDOR_PATH = `${__dirname}/../../vendor`;
const defaults = {
  hasSocketWatching: true,
  vendorPrepends: null,
  vendorAppends: null,
  fastboot: true
};

// TODO: make socketPort dynamic
export default function(ENV={ environment: 'development' }, options={
  hasSocketWatching: true, vendorPrepends: null, vendorAppends: null, fastboot: true
}) {
  const OPTIONS = Object.assign({}, defaults, options);
  const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
  const environment = ENV.environment || 'development';
  const PROJECT_ROOT = findProjectRoot();
  const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/vendor.js`;

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');

    const timer = countTime();

    return readBaseEmber(APPLICATION_NAME, ENV, OPTIONS).then((fileContent) => {
      return writeVendorJS(
        OUTPUT_PATH,
        ` ${OPTIONS.vendorPrepends || ''}
          window.EmberENV = ${inspect(ENV, { depth: null })};
          window.runningTests = ${environment === 'test' || environment === 'backend-test'};
          ${fileContent}
          ${addSocketWatch(OPTIONS.hasSocketWatching)}
          ${OPTIONS.vendorAppends || ''}
        `,
        environment
      );
    }).then(() => {
      const timePassed = timer.stop();

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} vendor.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: vendor.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    });
  });
}

function readBaseEmber(APPLICATION_NAME, ENV, options) {
  return new Promise((resolve) => {
    const emberBuildPath = `${VENDOR_PATH}/${getEmberVendorBuild(ENV)}`;

    const baseOperations = [
      fs.readFile(emberBuildPath),
      ENV.excludeEmberData ? '' : importAddonFolderToAMD(APPLICATION_NAME, 'ember-data/app'),
    ];

    if (options.fastboot) {
      return Promise.all(baseOperations.concat([
        fs.readFile(`${VENDOR_PATH}/fastboot/fastboot-addon-modules.js`),
        ENV.memserver && ENV.memserver.enabled ?
          fs.readFile(`${VENDOR_PATH}/memserver/fastboot/initializers/ajax.js`) :
          fs.readFile(`${VENDOR_PATH}/fastboot/initializers/ajax.js`),
        fs.readFile(`${VENDOR_PATH}/fastboot/initializers/error-handler.js`),
        importAddonFolderToAMD(APPLICATION_NAME, 'ember-cli-fastboot/app') // NOTE: should this be moved? make this loaded on application.js?
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
      }).catch((error) => console.log('BUILD VENDOR ERROR:', error));
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

function addSocketWatch(watching) {
  return !watching ? '' : `
    if (typeof FastBoot === 'undefined') {
      window.socket = new WebSocket('ws://localhost:65511');

      window.socket.addEventListener('message', function(event) {
        document.querySelectorAll('.ember-view').forEach((e) => e.remove());
        window.location.reload(true);
      });
    }
  `;
}
