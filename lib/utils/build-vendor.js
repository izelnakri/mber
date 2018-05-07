import fs from 'fs';
import { promisify } from 'util';
import importAddonToAMD from './import-addon-to-amd';

// TODO: transformations
// TODO: get additional vendor injections before + after
// TODO: move ember-data to /scripts with debug + prod
// TODO: check ember-data production strips

const readFileAsync = promisify(fs.readFile);

export default function() {
  return new Promise((resolve) => {
    return Promise.all([
      readFileAsync('./vendor/loader.js'),
      readFileAsync('./vendor/jquery.js'),
      readFileAsync('./vendor/ember.debug.js'),
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
      fs.writeFileSync('./ember-app-boilerplate/tmp/vendor.js', fileContents.join('\n') + `
        window.requirejs = requirejs;
        window.require = require;
        window.define = define;
        ['ember-data'].forEach((string) => window.DS = require(string).default); // NOTE: avoiding parcel require lookup
      `);
      resolve(console.log('vendor.js build finished')); // put time, size and env
    });
  });
}

// TODO: cache default dependencies under /vendor
