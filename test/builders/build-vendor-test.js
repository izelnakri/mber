// TODO: add memserver and demo
import fs from 'fs';
import test from 'ava';
import { promisify } from 'util';
import mockProcessCWD from '../helpers/mock-process-cwd';
import buildVendor from '../../lib/builders/build-vendor';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const CWD = process.cwd();
const readFileAsync = promisify(fs.readFile);

test.serial('buildVendor() works', async (t) => {
  t.plan(9);

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const result = await buildVendor();
  const timeTakenForVendor = result.message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(result.message.includes('Environment: development'));
  t.true(1000 < Number(timeTakenForVendor) < 5000);

  const vendorJs = await readFileAsync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`);

  t.deepEqual(vendorJs.length, 2821771);

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(fs.readFileSync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`).toString());

  [
    window.Ember, window.Ember.Object, window.jQuery, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(development) works', async (t) => {
  t.plan(9);

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const result = await buildVendor('development');
  const timeTakenForVendor = result.message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(result.message.includes('Environment: development'));
  t.true(1000 < Number(timeTakenForVendor) < 5000);

  const vendorJs = await readFileAsync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`);

  t.deepEqual(vendorJs.length, 2821771);

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(fs.readFileSync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`).toString());

  [
    window.Ember, window.Ember.Object, window.jQuery, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(production) works', async (t) => {
  t.plan(9);

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const result = await buildVendor('production');
  const timeTakenForVendor = result.message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '');

  t.true(result.message.includes('Environment: production'));
  t.true(1000 < Number(timeTakenForVendor) < 5000);

  const vendorJs = await readFileAsync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`);

  t.deepEqual(vendorJs.length, 780545); // 723k
                           // 2743937
  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(fs.readFileSync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`).toString());

  [
    window.Ember, window.Ember.Object, window.jQuery, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(test) works', async (t) => {
  t.plan(9);

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const result = await buildVendor('test');
  const timeTakenForVendor = result.message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(result.message.includes('Environment: test'));
  t.true(1000 < Number(timeTakenForVendor) < 5000);

  const vendorJs = await readFileAsync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`);

  t.deepEqual(vendorJs.length, 2821859);

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(fs.readFileSync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`).toString());

  [
    window.Ember, window.Ember.Object, window.jQuery, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test('buildVendor(custom) works', async (t) => {
  t.plan(9);

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const result = await buildVendor('custom');
  const timeTakenForVendor = result.message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(result.message.includes('Environment: custom'));
  t.true(1000 < Number(timeTakenForVendor) < 5000);

  const vendorJs = await readFileAsync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`);

  t.deepEqual(vendorJs.length, 2821766);

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(fs.readFileSync(`${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`).toString());

  [
    window.Ember, window.Ember.Object, window.jQuery, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});
