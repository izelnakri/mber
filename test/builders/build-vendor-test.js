// NOTE: maybe remove size checker for some tests
import test from 'ava';
import fs from 'fs-extra';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import codeHasWatchSocket from '../helpers/code-has-watch-socket';
import buildVendor from '../../lib/builders/build-vendor';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';
import {
  VENDOR_JS_BUILD_TIME_THRESHOLD,
  VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD
} from '../helpers/asset-build-thresholds';
import {
  DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE,
  DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE,
  FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE,
  FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE,
  NO_EMBER_DATA_VENDOR_JS_TARGET_BYTE_SIZE,
  NO_EMBER_DATA_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE,
  NO_EMBER_DATA_FASTBOOT_VENDOR_JS_TARGET_BYTE_SIZE,
  NO_EMBER_DATA_FASTBOOT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE
} from '../helpers/asset-sizes';

const CWD = process.cwd();
const VENDOR_JS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/vendor.js`;
const DEFAULT_BROWSER_EMBER_ENV = {
  LOG_STACKTRACE_ON_DEPRECATION: true,
  LOG_VERSION: true,
  RAISE_ON_DEPRECATION: false,
  _APPLICATION_TEMPLATE_WRAPPER: true,
  _TEMPLATE_ONLY_GLIMMER_COMPONENTS: false,
  environment: 'development'
};

test.beforeEach(async () => {
  await fs.remove(`${CWD}/ember-app-boilerplate/tmp`);
  await fs.mkdirp(`${CWD}/ember-app-boilerplate/tmp/assets`);
});

test.serial('buildVendor() works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor();

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), DEFAULT_BROWSER_EMBER_ENV);
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(development) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'development' }, { fastboot: true });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), DEFAULT_BROWSER_EMBER_ENV);
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(development) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'development', excludeEmberData: true });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[1\.90 MB\] Environment: development/g.test(message));

  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === NO_EMBER_DATA_FASTBOOT_VENDOR_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === NO_EMBER_DATA_FASTBOOT_VENDOR_JS_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: true, fastboot: true, excludeEmberData: true
  });

  t.deepEqual(getWindowENV(window.EmberENV), DEFAULT_BROWSER_EMBER_ENV);
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(development, { fastboot: false }) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'development' }, { fastboot: false });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: false });

  t.deepEqual(getWindowENV(window.EmberENV), DEFAULT_BROWSER_EMBER_ENV);
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(development, { fastboot: false }) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({
    environment: 'development', excludeEmberData: true
  }, { fastboot: false });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[1\.89 MB\] Environment: development/g.test(message));

  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === NO_EMBER_DATA_VENDOR_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === NO_EMBER_DATA_VENDOR_JS_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: true, fastboot: false, excludeEmberData: true
  });

  t.deepEqual(getWindowENV(window.EmberENV), DEFAULT_BROWSER_EMBER_ENV);
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(production) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'production' }, {
    fastboot: true, hasSocketWatching: false
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[698\.57 kB\] Environment: production/g.test(message));

  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(stats.size === FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: false, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'production'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(production) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({
    environment: 'production', excludeEmberData: true
  }, { fastboot: true, hasSocketWatching: false });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[497\.11 kB\] Environment: production/g.test(message));

  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === NO_EMBER_DATA_FASTBOOT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(stats.size === NO_EMBER_DATA_FASTBOOT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: false, fastboot: true, excludeEmberData: true
  });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'production'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(production, { fastboot: false }) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'production' }, {
    fastboot: false, hasSocketWatching: false
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[692\.93 kB\] Environment: production/g.test(message));

  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(stats.size === DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: false, fastboot: false });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'production'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(production, { fastboot: false }) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({
    environment: 'production', excludeEmberData: true
  }, { fastboot: false, hasSocketWatching: false });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[491\.48 kB\] Environment: production/g.test(message));

  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === NO_EMBER_DATA_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(stats.size === NO_EMBER_DATA_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: false, fastboot: false, excludeEmberData: true
  });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'production'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(test) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'test' });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: test/g.test(message));

  const targetSize = FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE - 8;
  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'test'
  }));
  t.true(window.runningTests);

  mock.removeMock();
});

test.serial('buildVendor(test) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'test', excludeEmberData: true });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[1\.90 MB\] Environment: test/g.test(message));

  const targetSize = NO_EMBER_DATA_FASTBOOT_VENDOR_JS_TARGET_BYTE_SIZE - 8;
  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: true, fastboot: true, excludeEmberData: true
  });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'test'
  }));
  t.true(window.runningTests);

  mock.removeMock();
});

test.serial('buildVendor(memserver) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({
    environment: 'memserver', modulePrefix: 'izelnakri',
    _APPLICATION_TEMPLATE_WRAPPER: false, _TEMPLATE_ONLY_GLIMMER_COMPONENTS: true
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: memserver/g.test(message));

  const targetSize = FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE + 117;
  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true }, 'izelnakri');

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'memserver',
    _APPLICATION_TEMPLATE_WRAPPER: false,
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: true
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(memserver) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({
    environment: 'memserver', modulePrefix: 'my-app',  excludeEmberData: true
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[1\.90 MB\] Environment: memserver/g.test(message));

  const targetSize = NO_EMBER_DATA_VENDOR_JS_TARGET_BYTE_SIZE + 9485;
  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: true, fastboot: true, excludeEmberData: true
  }, 'my-app');

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'memserver'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(demo) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'demo' }, { hasSocketWatching: false });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[823\.87 kB\] Environment: demo/g.test(message));

  const targetSize = FASTBOOT_DEFAULT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE + 125304;
  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: false, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'demo'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(demo) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({
    environment: 'demo', excludeEmberData: true
  }, { hasSocketWatching: false });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[622\.25 kB\] Environment: demo/g.test(message));

  const targetSize = NO_EMBER_DATA_FASTBOOT_VENDOR_JS_COMPRESSED_TARGET_BYTE_SIZE + 125131;
  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: false, fastboot: true, excludeEmberData: true
  });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'demo'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(custom) works', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'custom' });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: custom/g.test(message));

  const targetSize = FASTBOOT_DEFAULT_VENDOR_JS_TARGET_BYTE_SIZE - 5;
  const vendorJSBuffer = (await fs.readFile(VENDOR_JS_OUTPUT_PATH));
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize)
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true })

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'custom'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(custom) works without ember data', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildVendor({ environment: 'custom', excludeEmberData: true });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[1\.90 MB\] Environment: custom/g.test(message));

  const targetSize = NO_EMBER_DATA_FASTBOOT_VENDOR_JS_TARGET_BYTE_SIZE - 5;
  const vendorJSBuffer = await fs.readFile(VENDOR_JS_OUTPUT_PATH);
  const vendorJSSize = vendorJSBuffer.length;
  const vendorJSCode = vendorJSBuffer.toString();

  t.true(vendorJSSize === targetSize);
  t.true(stats.size === targetSize);

  await testJavaScriptContents(t, vendorJSCode, {
    hasSocketWatching: true, fastboot: true, excludeEmberData: true
  })

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'custom'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(development, { vendorPrepends }) work', async (t) => {
  t.plan(31);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const CODE_TO_PREPEND = '(function() { console.log("this is prepending code") })()';
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message } = await buildVendor({ environment: 'development' }, {
    vendorPrepends: CODE_TO_PREPEND
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: development/g.test(message));

  const vendorJSCode = (await fs.readFile(VENDOR_JS_OUTPUT_PATH)).toString().trim();

  t.true(vendorJSCode.startsWith(CODE_TO_PREPEND));

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), DEFAULT_BROWSER_EMBER_ENV);
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(development, { vendorAppends }) work', async (t) => {
  t.plan(31);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const CODE_TO_APPEND = '(function() { console.log("this is appending code") })()';
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message } = await buildVendor({ environment: 'custom' }, {
    vendorAppends: CODE_TO_APPEND
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: custom/g.test(message));

  const vendorJSCode = (await fs.readFile(VENDOR_JS_OUTPUT_PATH)).toString().trim();

  t.true(vendorJSCode.endsWith(CODE_TO_APPEND));

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'custom'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

test.serial('buildVendor(memserver, { vendorPrepends, vendorAppends }) work', async (t) => {
  t.plan(32);

  t.true(!(await fs.exists(VENDOR_JS_OUTPUT_PATH)));

  const CODE_TO_PREPEND = '(function(){console.log("this is prepending code")})()';
  const CODE_TO_APPEND = '(function(){console.log("this is appending code")})()';
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message } = await buildVendor({ environment: 'memserver' }, {
    hasSocketWatching: true, fastboot: true,
    vendorPrepends: CODE_TO_PREPEND, vendorAppends: CODE_TO_APPEND
  });

  t.true(getTimeTakenForBuild(message) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/BUILT: vendor\.js in \d+ms \[2\.50 MB\] Environment: memserver/g.test(message));

  const vendorJSCode = (await fs.readFile(VENDOR_JS_OUTPUT_PATH)).toString().trim();

  t.true(vendorJSCode.startsWith(CODE_TO_PREPEND));
  t.true(vendorJSCode.endsWith(CODE_TO_APPEND));

  await testJavaScriptContents(t, vendorJSCode, { hasSocketWatching: true, fastboot: true });

  t.deepEqual(getWindowENV(window.EmberENV), Object.assign({}, DEFAULT_BROWSER_EMBER_ENV, {
    environment: 'memserver'
  }));
  t.true(window.runningTests === false);

  mock.removeMock();
});

function getTimeTakenForBuild(message) {
  return Number(message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', ''));
}

Object.filter = (object, keys) => {
  if (!Array.isArray(keys)) {
    return object;
  }

  return Object.keys(object).reduce((result, key) => {
    if (keys.includes(key)) {
      return Object.assign(result, { [key]: object[key] });
    }

    return result;
  }, {});
}

function getWindowENV(ENV) {
  return Object.filter(ENV, [
    'LOG_STACKTRACE_ON_DEPRECATION', 'LOG_VERSION', 'RAISE_ON_DEPRECATION',
    '_APPLICATION_TEMPLATE_WRAPPER', '_TEMPLATE_ONLY_GLIMMER_COMPONENTS', 'environment'
  ]);
}

async function injectToBrowser(javaScriptCode) {
  await injectBrowserToNode();

  global.window.eval(javaScriptCode);
}

async function testJavaScriptContents(t, code, options={
  hasSocketWatching: true, excludeEmberData: false, fastboot: true
}, modulePrefix='frontend') {
  t.true(codeIncludesAMDModule(code, '@glimmer/resolver/index'));
  t.true(codeIncludesAMDModule(code, '@glimmer/di'));
  t.true(codeIncludesAMDModule(code, 'ember-inflector/index'));
  t.true(codeIncludesAMDModule(code, 'ember-load-initializers/index'));
  t.true(codeIncludesAMDModule(code, 'ember-resolver/index'));

  if (options.excludeEmberData) {
    t.true(!codeIncludesAMDModule(code, 'ember-data/index'));
    t.true(!codeIncludesAMDModule(code, 'ember-data/model'));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/initializers/ember-data`));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/instance-initializers/ember-data`));
  } else {
    t.true(codeIncludesAMDModule(code, 'ember-data/index'));
    t.true(codeIncludesAMDModule(code, 'ember-data/model'));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/initializers/ember-data`));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/instance-initializers/ember-data`));
  }

  if (options.fastboot) {
    t.true(codeIncludesAMDModule(code, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
    t.true(codeIncludesAMDModule(code, 'ember-cli-fastboot/locations/none'));
    t.true(codeIncludesAMDModule(code, 'ember-cli-fastboot/services/fastboot'));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/initializers/ajax`));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/initializers/error-handler`));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/instance-initializers/clear-double-boot`));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/locations/none`));
    t.true(codeIncludesAMDModule(code, `${modulePrefix}/services/fastboot`));
  } else {
    t.true(!codeIncludesAMDModule(code, 'ember-cli-fastboot/instance-initializers/clear-double-boot'));
    t.true(!codeIncludesAMDModule(code, 'ember-cli-fastboot/locations/none'));
    t.true(!codeIncludesAMDModule(code, 'ember-cli-fastboot/services/fastboot'));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/initializers/ajax`));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/initializers/error-handler`));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/instance-initializers/clear-double-boot`));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/locations/none`));
    t.true(!codeIncludesAMDModule(code, `${modulePrefix}/services/fastboot`));
  }

  t.true(!codeIncludesAMDModule(code, 'jquery'));
  options.hasSocketWatching ? t.true(codeHasWatchSocket(code)) : t.true(!codeHasWatchSocket(code));

  await injectToBrowser(code);

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define,
    options.hasSocketWatching ? window.socket : !window.socket
  ].forEach((object) => t.truthy(object));
}
