import { promisify } from 'util';
import fs from 'fs';
import buildEmberData from './build-ember-data';

// TODO: transformations
// TODO: get additional vendor injections before + after
// TODO: there supposed to be a loader.js?

// TODO: move ember-data to /scripts with debug + prod

const readFileAsync = promisify(fs.readFile);

export default function() {
  Promise.all([
    readFileAsync('./vendor/jquery.js'),
    readFileAsync('./vendor/ember.debug.js'),
    buildEmberData()
  ]).then(([jquerySrc, emberSrc, emberDataSrc]) => {
    fs.writeFileSync('./ember-app-boilerplate/tmp/vendor.js', jquerySrc + emberSrc + emberDataSrc);
    console.log('vendor build finished');
  });
}
