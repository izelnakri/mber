// TODO: do actual building of test, production and memserver assets
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import test from 'ava';
import rimraf from 'rimraf';
import createDummyApp from '../helpers/create-dummy-app';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const shell = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

test.beforeEach(async () => {
  if (fs.existsSync('dummyapp')) {
    await rimraf.sync('dummyapp');
  }
});

test.afterEach.always(async () => {
  if (fs.existsSync('dummyapp')) {
    await rimraf.sync('dummyapp');
  }
});

test.serial('$ mber build -> builds successfully', async (t) => {
  // t.plan(20);

  await createDummyApp();

  const CWD = process.cwd();
  const { stdout } = await shell(`node ${CWD}/cli.js build`, { cwd: `${CWD}/dummyapp` });

  console.log('stdout is', stdout);

  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  // t.true(/ember BUILT: vendor\.js in \d+ms \[2\.74 MB\] Environment: development/g.test(stdout));

  const timeTakenForVendor = stdout.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(1000 < Number(timeTakenForVendor) < 5000);

  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(/ember BUILT: application\.js in \d+ms \[0\.00 MB\] Environment: development/g.test(stdout));

  const timeTakenForApplication = stdout.match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '')

  t.true(1000 < Number(timeTakenForApplication) < 5000);

  t.true(/ember BUNDLED: dummyapp in \d+ms/g.test(stdout));

  await Promise.all([
    readdirAsync('./dummyapp/dist'),
    readFileAsync('./dummyapp/tmp/vendor.js'),
    readFileAsync('./dummyapp/tmp/application.js')
  ]).then(([dist, vendorJs, applicationJs]) => {
    t.true(dist.includes('index.html'));
    t.truthy(dist.find((entity) => /vendor\.\w+\.js/g.test(entity)));
    t.truthy(dist.find((entity) => /application\.\w+\.js/g.test(entity)));

    t.true(1000 < vendorJs.length < 5000);
    t.true(0 < applicationJs.length < 1000);

    injectBrowserToNode(null, {
      url: 'http://localhost:1234',
      resources: 'usable',
      runScripts: 'outside-only'
    });

    window.eval(fs.readFileSync(`${CWD}/dummyapp/tmp/vendor.js`).toString());
    window.eval(fs.readFileSync(`${CWD}/dummyapp/tmp/application.js`).toString());

    [
      // window.Ember, window.Ember.Object, window.DS, window.jQuery, window.requirejs,
      window.require, window.define
      // , window.APP
    ].forEach((object) => t.truthy(object));
  }).catch((error) => console.log('error is', error));
});

// test.serial('$ mber build --env=production -> builds successfully', async (t) => {
//
// });

// TODO: test test build

// TODO: test memserver build

// TODO: if parent doesnt exist throw error

// TODO: test build with watch
