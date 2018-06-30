import test from 'ava';
import fs from 'fs-extra';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import codeHasWatchSocket from '../helpers/code-has-watch-socket';
import buildVendor from '../../lib/builders/build-vendor';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const CWD = process.cwd();
const VENDOR_JS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`;
// TODO: vendor.js should have min and max range instead
const DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE = 2495344;
const DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE = 692933;
const FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE = 2504860;
const FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE = 698551;
// const NO_EMBER_DATA_VENDOR_JS_TARGET_BYTE_SIZE = 0;
// const NO_EMBER_DATA_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE = 0;
// const FASTBOOT_NO_EMBER_DATA_VENDOR_JS_TARGET_BYTE_SIZE = 0;
// const FASTBOOT_NO_EMBER_DATA_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE = 0;

test.beforeEach(async () => {
  await fs.remove(VENDOR_JS_OUTPUT_PATH);
});

// vendorPrepends, vendorAppends works, combi working
// test data ember-data exclude is working. -> should fastboot booting be delayed and done on application.js?

// assert that there is window.EmberENV assignment (default)
// assert that there is window.runningTests assignment (default)

test.serial('buildVendor() works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor();
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 600);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(development) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'development' }, { fastboot: true });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 600);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(development, { fastboot: false }) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'development' }, { fastboot: false });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 600);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(production) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'production' }, { fastboot: true, hasSocketWatching: false });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 9000);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(!codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[0\.70 MB\] Environment: production/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, !window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(production, { fastboot: false }) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'production' }, { fastboot: false, hasSocketWatching: false });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 9000);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(!codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[0\.69 MB\] Environment: production/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, !window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(test) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'test' });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 600);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === (FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE - 8));

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: test/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(memserver) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'memserver' });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 600);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === (FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE - 2));

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: memserver/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test.serial('buildVendor(demo) works', async (t) => {
  t.plan(28);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'demo' }, { hasSocketWatching: false });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 9000);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  // t.true(stats.size === (FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE + 4));

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(!codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[0\.82 MB\] Environment: demo/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, !window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});

test('buildVendor(custom) works', async (t) => {
  t.plan(29);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'custom' });
  const timeTakenForVendor = message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForVendor) < 600);

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(stats.size === (FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE - 5));

  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, '@glimmer/di'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-data/model'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-resolver/index'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/ember-data'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'ember-cli-fastboot/services/fastboot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/ajax'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/initializers/error-handler'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/instance-initializers/clear-double-boot'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/locations/none'));
  t.true(codeIncludesAMDModule(vendorJSCode, 'frontend/services/fastboot'));
  t.true(!codeIncludesAMDModule(vendorJSCode, 'jquery'));
  t.true(codeHasWatchSocket(vendorJSCode));

  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: custom/g.test(message));

  injectBrowserToNode(null, {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'outside-only'
  });

  window.eval(vendorJSCode.toString());

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define, window.socket
  ].forEach((object) => t.truthy(object));

  mock.removeMock();
});
