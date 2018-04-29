import fs from 'fs';

// TODO: transformations
// TODO: get additional vendor injections before + after

export default function() {
  Promise.all([
    fs.readFileSync('./vendor/jquery.js'),
    fs.readFileSync('./vendor/ember.debug.js')
  ]).then(([jquerySrc, emberSrc]) => {
    fs.writeFileSync('./ember-app-boilerplate/tmp/vendor.js',  jquerySrc + emberSrc);
    console.log('vendor build finished');
  });
}
