import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import Console from './console';
import importAddonToAMD from './import-addon-to-amd';
import searchInParentDirectories from './search-in-parent-directories';
import countTime from './count-time';

// TODO: transformations
// TODO: get additional vendor injections before + after
// TODO: move ember-data to /scripts with debug + prod
// TODO: check ember-data production strips

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat)

export default function() {
  const vendorPath = `${__dirname}/../..`;

  console.log('vendorPath is', vendorPath);

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'vendor.js...');
    let spinner = Console.spinner('BUILDING: vendor.js...');

    const timer = countTime();

    return Promise.all([
      readFileAsync(`${vendorPath}/vendor/loader.js`), // NOTE: this is wrong
      readFileAsync(`${vendorPath}/vendor/jquery.js`),
      readFileAsync(`${vendorPath}/vendor/ember.debug.js`),
      new Promise((resolve) => resolve(`
        define('@ember/ordered-set/index', ['exports'], function (exports) {
          exports.default = Ember.OrderedSet;
        });
      `)),
      importAddonToAMD('ember-inflector', 'ember-inflector/addon'),
      importAddonToAMD('ember-data', 'ember-data/addon'),
      new Promise((resolve) => resolve(`
        define('ember-data/version', ['exports'], function (exports) {
          exports.default = '3.1.1';
        });
      `)), // TODO: get from package.json
    ]).then((fileContents) => {
      const PACKAGE_JSON_PATH = searchInParentDirectories(process.cwd(), 'package.json');
      const PROJECT_PATH = PACKAGE_JSON_PATH.replace('/package.json', '');
      // console.log('PROJECT_PATH is', PROJECT_PATH);
      return writeFileAsync(`${PROJECT_PATH}/tmp/vendor.js`, fileContents.join('\n') + `
        window.requirejs = requirejs;
        window.require = require;
        window.define = define;
        ['ember-data'].forEach((string) => window.DS = require(string).default); // NOTE: avoiding parcel require lookup
      `);
    }).then(() => {
      const PACKAGE_JSON_PATH = searchInParentDirectories(process.cwd(), 'package.json');
      const PROJECT_PATH = PACKAGE_JSON_PATH.replace('/package.json', '');
      const timePassed = timer.stop();

      spinner.stop();

      statAsync(`${PROJECT_PATH}/tmp/vendor.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} vendor.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: development`);

        resolve({
          message: `BUILT: vendor.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: development`,
          stats: stats
        });
      })
    });
  });
}

function formatTimePassed(timePassed) {
  return chalk.yellow(`${timePassed}ms`);
}

function formatSize(sizeInBytes) {
  const sizeInMb = (sizeInBytes % 1000000) > 0

  if (sizeInMb) {
    return `${(sizeInBytes / 1000000).toFixed(2)} MB`;
  }

  return `${(sizeInBytes / 1000).toFixed(2)} KB`;
}

// TODO: cache default dependencies under /vendor
