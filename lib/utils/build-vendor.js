// TODO: compress based on environment
import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-js';
import Console from './console';
import importAddonToAMD from './import-addon-to-amd';
import searchInParentDirectories from './search-in-parent-directories';
import countTime from './count-time';
import { formatTimePassed, formatSize } from './asset-reporter';

// TODO: transformations
// TODO: get additional vendor injections before + after
// TODO: move ember-data to /scripts with debug + prod
// TODO: check ember-data production strips
// MAYBE: backburner = require('ember-metal').run.backburner

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat)

export default function(environment='development') {
  const vendorPath = `${__dirname}/../..`;

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');

    const timer = countTime();

    // TODO: we can cache optimize the output via vendor files
    // TODO: production strips
    return Promise.all([
      readFileAsync(`${vendorPath}/vendor/loader.js`), // NOTE: this is wrong
      readFileAsync(`${vendorPath}/vendor/jquery.js`),
      injectEmberJS(vendorPath, environment),
      new Promise((resolve) => resolve(`
        define('@ember/ordered-set/index', ['exports'], function (exports) {
          exports.default = Ember.OrderedSet;
        });
      `)),
      importAddonToAMD('ember-inflector', 'ember-inflector/addon'),
      importAddonToAMD('ember-data', 'ember-data/addon'), // NOTE: make this production build?
      new Promise((resolve) => resolve(`
        define('ember-data/version', ['exports'], function (exports) {
          exports.default = '3.1.1';
        });
      `)), // TODO: get from package.json
      importAddonToAMD('ember-load-initializers', 'ember-load-initializers/addon'),
      importAddonToAMD('ember-resolver', 'ember-resolver/addon')
    ]).then((fileContents) => {
      const PROJECT_PATH = searchInParentDirectories(process.cwd(), 'package.json')
        .replace('/package.json', '');
      // console.log('PROJECT_PATH is', PROJECT_PATH);

      return writeVendorJS(
        `${PROJECT_PATH}/tmp/vendor.js`,
        fileContents.join('\n') + `
        window.requirejs = requirejs;
        window.require = require;
        window.define = define;`,
        environment
      );
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

function injectEmberJS(vendorPath, environment) {
  // if (environment === 'production') {
  //   return readFileAsync(`${vendorPath}/vendor/ember.prod.js`);
  // } else if (environment === 'test') {
  //   return readFileAsync(`${vendorPath}/vendor/ember.debug.js`); // TODO: should be different
  // }

  return readFileAsync(`${vendorPath}/vendor/ember.debug.js`);
}

function writeVendorJS(path, content, environment) {
  // if (environment === 'production') {
  //   const minified = UglifyJS.minify(content, {
  //     toplevel: true,
  //     negate_iife: false,
  //     sequences: 30
  //   }).code;
  //
  //   console.log('minified', minified);
  //
  //   return writeFileAsync(path, minified);
  // }

  return writeFileAsync(path, content);
}

// TODO: cache default dependencies under /vendor


// NOTE: check watch libs: chokidar(bad rap seems most popular), watchman(good rep), gaze, sane(new meh),  watch, fb-watchman
