import fs from 'fs';
import { promisify, inspect } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-js';
import importAddonFolderToAMD from '../transpilers/import-addon-folder-to-amd';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import countTime from '../utils/count-time';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat)

const VENDOR_PATH = `${__dirname}/../../vendor`;
const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', ENV={}, options={
  hasSocketWatching: false, vendorPrepends: null, vendorAppends: null, fastboot: true
}) {
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');

    const timer = countTime();

    return readBaseEmber(ENV, options).then((fileContent) => {
      return writeVendorJS(
        `${PROJECT_ROOT}/tmp/assets/vendor.js`,
        ` ${options.vendorPrepends || ''}
          window.EmberENV = ${inspect(ENV, { depth: null })};
          window.runningTests = ${environment === 'test'};
          ${fileContent}
          ${addSocketWatch(options.hasSocketWatching)}
          ${options.vendorAppends || ''}
        `,
        environment
      );
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(`${PROJECT_ROOT}/tmp/assets/vendor.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} vendor.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: vendor.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      })
    });
  });
}

function readBaseEmber(ENV, options) {
  return new Promise((resolve) => {
    const emberBuildPath = `${VENDOR_PATH}/${getEmberVendorBuild(ENV)}`;

    if (options.fastboot) {
      return Promise.all([
        readFileAsync(emberBuildPath),
        readFileAsync(`${VENDOR_PATH}/fastboot-modules.js`),
        importAddonFolderToAMD(ENV.modulePrefix, 'ember-cli-fastboot/app')
      ]).then(([emberContent, fastbootModules, appFastbootModules]) => {
        resolve(`
          ${emberContent}

          ${fastbootModules}

          if (typeof FastBoot === 'undefined') {
            ${appFastbootModules}
          }
        `);
      });
    }

    return readFileAsync(emberBuildPath).then((content) => resolve(content));
  });
}

function getEmberVendorBuild(ENV) {
  const tag = ENV.environment === 'production' ? 'prod' : 'debug';

  if (ENV.excludeJQuery && ENV.excludeEmberData) {
    return `only-ember-${tag}.js`;
  } else if (ENV.excludeJQuery) {
    return `no-jquery-ember-${tag}.js`;
  } else if (ENV.excludeEmberData) {
    return `no-ember-data-ember-${tag}.js`;
  }

  return `full-ember-${tag}.js`;
}

function writeVendorJS(path, content, environment) {
  if (['demo', 'production'].includes(environment)) {
    const minified = UglifyJS.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code;

    return writeFileAsync(path, minified);
  }

  return writeFileAsync(path, content);
}

function addSocketWatch(watching) {
  return !watching ? '' : `
    if (typeof FastBoot === 'undefined') {
      window.socket = new WebSocket('ws://localhost:65511');

      socket.addEventListener('message', function(event) {
        document.querySelector('.ember-application > .ember-view').remove();
        document.querySelector('.ember-application').classList.forEach((className) => {
          className === 'ember-application' ?
            document.querySelector('.ember-application').classList
              .toggle('ember-application') : null;
        });
        window.location.reload(true);
      });
    }
  `;
}

// NOTE: check watch libs: chokidar(bad rap seems most popular), watchman(good rep), gaze, sane(new meh),  watch, fb-watchman
