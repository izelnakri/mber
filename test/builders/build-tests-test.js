import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import buildTests from '../../lib/builders/build-tests.js';

const CWD = process.cwd();
const TESTS_JS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/tests.js`;
const TESTS_JS_TARGET_BYTE_SIZE = 1890;
const TESTS_JS_COMPILE_TRESHOLD = 1000;

test.beforeEach(async () => {
  await fs.remove(TESTS_JS_OUTPUT_PATH);
});

test.serial('buildTests() works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests();
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_COMPILE_TRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === TESTS_JS_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[1\.89 kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildTests(development) works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({ environment: 'development' });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_COMPILE_TRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === TESTS_JS_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[1\.89 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildTests(test) works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({ environment: 'test' });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_COMPILE_TRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === TESTS_JS_TARGET_BYTE_SIZE);
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'frontend/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('frontend/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[1\.89 kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildTests(custom) works', async (t) => {
  t.plan(10);

  t.true(!(await fs.exists(TESTS_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildTests({
    environment: 'test-backend', modulePrefix: 'coolapp'
  });
  const timeTakenForBuild = message.match(/tests\.js in \d+ms/g)[0]
    .replace('tests.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < TESTS_JS_COMPILE_TRESHOLD);

  const testsJSBuffer = await fs.readFile(TESTS_JS_OUTPUT_PATH);
  const testsJSCode = testsJSBuffer.toString().trim();

  t.true(testsJSBuffer.length === TESTS_JS_TARGET_BYTE_SIZE - 7);
  t.true(stats.size === TESTS_JS_TARGET_BYTE_SIZE - 7);
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/tests/test-helper'));
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/src/ui/components/welcome-page/integration-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/src/ui/routes/index/unit-test'));
  t.true(codeIncludesAMDModule(testsJSCode, 'coolapp/tests/unit/models/dummy-test'));
  t.true(testsJSCode.includes("window.require('coolapp/tests/test-helper')"));
  t.true(/BUILT: tests\.js in \d+ms \[1\.88 kB\] Environment: test-backend/g.test(message));

  mock.removeMock();
});
