import fs from 'fs';
import { promisify, inspect } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-js';
import Console from './console';
import findProjectRoot from './find-project-root';
import searchInParentDirectories from './search-in-parent-directories';
import countTime from './count-time';
import { formatTimePassed, formatSize } from './asset-reporter';

// TODO: transformations
// TODO: get additional vendor injections before + after

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat)

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(environment='development') {
  const PROJECT_ROOT = findProjectRoot();
  const ENV = require(`${PROJECT_ROOT}/config/environment.js`)(environment);

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');

    const timer = countTime();

    return readFileAsync(`${VENDOR_PATH}/${getEmberVendorBuild(ENV)}`).then((fileContent) => {
      const PROJECT_PATH = searchInParentDirectories(process.cwd(), 'package.json')
        .replace('/package.json', '');

      return writeVendorJS(
        `${PROJECT_PATH}/tmp/vendor.js`,
        `
          window.EmberENV = ${inspect(ENV, { depth: null })};
          window.runningTests = ${environment === 'test'};
        ` + fileContent + addGlobals(ENV),
        environment
      ); // TODO: compress this for production environment
    }).then(() => {
      const PROJECT_PATH = searchInParentDirectories(process.cwd(), 'package.json')
        .replace('/package.json', '');
      const timePassed = timer.stop();

      statAsync(`${PROJECT_PATH}/tmp/vendor.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} vendor.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: vendor.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      })
    });
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
  if (environment === 'production') {
    const minified = UglifyJS.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false // no difference in size and much easier to debug
      }
    }).code;

    return writeFileAsync(path, minified);
  }

  return writeFileAsync(path, content);
}

function addGlobals(ENV) {
  const result = `;window.requirejs = requirejs;window.require = require;window.define = define;`;

  if (!['demo', 'production'].includes(ENV.environment)) {
    return result + "['ember-data'].forEach((mod) => window.DS = require(mod));";
  }

  return result;
}


// NOTE: check watch libs: chokidar(bad rap seems most popular), watchman(good rep), gaze, sane(new meh),  watch, fb-watchman
