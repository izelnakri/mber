import { promisify } from 'util';
import fs from 'fs';
import buildEmberData from './build-ember-data';

// TODO: transformations
// TODO: get additional vendor injections before + after
// TODO: there supposed to be a loader.js?

// TODO: move ember-data to /scripts with debug + prod

const readFileAsync = promisify(fs.readFile);

export default function() {
  return new Promise((resolve) => {
    return Promise.all([
      readFileAsync('./vendor/loader.js'),
      readFileAsync('./vendor/jquery.js'),
      readFileAsync('./vendor/ember.debug.js'),
      buildEmberData()
    ]).then((fileContents) => {
      fs.writeFileSync('./ember-app-boilerplate/tmp/vendor.js', fileContents.join('\n') + `
        window.requirejs = requirejs;
        window.require = require;
        window.define = define;
        require('ember-data');
      `);
      resolve(console.log('vendor build finished'));
    });
  });
}
