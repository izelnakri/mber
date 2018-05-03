import fs from 'fs';
import { promisify } from 'util';
import importAddonToAMD from './import-addon-to-amd';

// TODO: transformations
// TODO: get additional vendor injections before + after
// TODO: move ember-data to /scripts with debug + prod
// TODO: strip heimdall from ember-data

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
      `);
      resolve(console.log('vendor build finished'));
    });
  });
}

// TODO: cache default dependencies under /vendor
