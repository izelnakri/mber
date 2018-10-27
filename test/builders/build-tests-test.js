import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import buildTests from '../../lib/builders/build-tests.js';
import { TESTS_JS_DEFAULT_TARGET_BYTE_SIZE } from '../helpers/asset-sizes';
import { TESTS_JS_BUILD_TIME_THRESHOLD } from '../helpers/asset-build-thresholds';

const CWD = process.cwd();
const TESTS_JS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/tests.js`;

test.beforeEach(async () => {
  await fs.remove(`${CWD}/ember-app-boilerplate/tmp`);
  await fs.mkdirp(`${CWD}/ember-app-boilerplate/tmp/assets`);
});

test.serial('buildTests() works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests();
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(stats.size === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[3\.19 kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildTests(development) works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({ ENV: { environment: 'development' } });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(stats.size === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[3\.19 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildTests(test) works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({ ENV: { environment: 'test' } });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(stats.size === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[3\.19 kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildTests(custom) works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({
    ENV: { environment: 'test-backend', modulePrefix: 'coolapp' }
  });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE - 11);
  t.true(stats.size === TESTS_JS_DEFAULT_TARGET_BYTE_SIZE - 11);
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('coolapp/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[3\.18 kB\] Environment: test-backend/g.test(message));

  mock.removeMock();
});

test.serial('buildTests(development, { testPrepends }) work', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const CODE_TO_PREPEND = '(function() { console.log("this is prepending code") })()';
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({
    ENV: { environment: 'development' },
    buildCache: { testPrepends: CODE_TO_PREPEND }
  });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSCode.startsWith(`define = window.define; ${CODE_TO_PREPEND}`));

  t.true(testsJSBuffer.length > TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(stats.size > TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));

  mock.removeMock();
});

test.serial('buildVendor(development, { testAppends }) work', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const CODE_TO_APPEND = '(function() { console.log("this is prepending code") })()';
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({
    ENV: { environment: 'development' },
    buildCache: { testAppends: CODE_TO_APPEND }
  });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSCode.endsWith(`${CODE_TO_APPEND}`));

  t.true(testsJSBuffer.length > TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(stats.size > TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));

  mock.removeMock();
});

test.serial('buildVendor(memserver, { testPrepends, testAppends }) work', async (t) => {
  t.plan(11);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const CODE_TO_PREPEND = '(function(){console.log("this is prepending code")})()';
  const CODE_TO_APPEND = '(function(){console.log("this is appending code")})()';
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({
    ENV: { environment: 'development' },
    buildCache: { testPrepends: CODE_TO_PREPEND, testAppends: CODE_TO_APPEND }
  });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_BUILD_TIME_THRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSCode.startsWith(`define = window.define; ${CODE_TO_PREPEND}`));
  t.true(testsJSCode.endsWith(`${CODE_TO_APPEND}`));

  t.true(testsJSBuffer.length > TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(stats.size > TESTS_JS_DEFAULT_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));

  mock.removeMock();
});
