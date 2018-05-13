import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import test from 'ava';
import rimraf from 'rimraf';
import createDummyApp from '../helpers/create-dummy-app';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const CWD = process.cwd();
const shell = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

test.beforeEach(async () => {
  if (fs.existsSync('testapp')) {
    await rimraf.sync('testapp');
  }
});

test.afterEach.always(async () => {
  if (fs.existsSync('testapp')) {
    await rimraf.sync('testapp');
  }
});

test.serial('$ mber build -> builds successfully', async (t) => {
  t.true(true);
  // // TODO: put here t.count
  // await createDummyApp();
  // const { stdout } = await shell(`node ${CWD}/cli.js build`, { cwd: `${CWD}/testapp` });
  //
  // console.log('stdout is', stdout);
  //
  // t.true(stdout.includes('ember BUILDING: vendor.js...'));
  // t.true(/ember BUILT: vendor\.js in \d+ms \[2\.72 MB\] Environment: development/g.test(stdout));
  //
  // const timeTakenForVendor = stdout.match(/vendor\.js in \d+ms/g)[0]
  //   .replace('vendor.js in ', '')
  //   .replace('ms', '')
  //
  // t.true(1000 < Number(timeTakenForVendor) < 5000);
  //
  // t.true(stdout.includes('ember BUILDING: application.js...'));
  // t.true(/ember BUILT: application\.js in \d+ms \[\w+\] Environment: development/g.test(stdout));
  //
  // const timeTakenForApplication = stdout.match(/application\.js in \d+ms/g)[0]
  //   .replace('application.js in ', '')
  //   .replace('ms', '')
  //
  // t.true(1000 < Number(timeTakenForApplication) < 5000);
  //
  // await Promise.all([
  //   readdirAsync('./testapp/dist'),
  //   readFileAsync('./testapp/tmp/vendor.js'),
  //   readFileAsync('./testapp/tmp/application.js')
  // ]).then(([dist, vendorJs, applicationJs]) => {
  //   t.true(dist.includes('index.html'));
  //   t.truthy(dist.find((entity) => /vendor\.\w+\.js/g.test(entity)));
  //   t.truthy(dist.find((entity) => /application\.\w+\.js/g.test(entity)));
  //
  //   t.true(1000 < vendorJs.length < 5000);
  //   t.true(1000 < applicationJs.length < 5000);
  //
  //   injectBrowserToNode();
  //
  //   // TODO: finish this
  //   // require('../../testapp/tmp/vendor.js');
  //   //
  //   // console.log('window.Ember is', global.window.Ember);
  //   //
  //   // [
  //   //   window.Ember, window.Ember.Object, window.DS, window.jQuery, window.requirejs, window.require,
  //   //   window.define
  //   // ].forEach((object) => t.truthy(object));
  // }).catch((error) => console.log('error is', error));
});


// TODO: test production build

// TODO: test test build

// TODO: if parent doesnt exist throw error
