import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import buildMemserver from '../../lib/builders/build-memserver.js';
import {
  MEMSERVER_JS_BUILD_TIME_THRESHOLD,
  MEMSERVER_JS_COMPRESSED_BUILD_THRESHOLD
} from '../helpers/asset-build-thresholds';
import {
  MEMSERVER_JS_TARGET_BYTE_SIZE,
  MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE
} from '../helpers/asset-sizes';

const CWD = process.cwd();
const MEMSERVER_JS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/memserver.js`;

test.beforeEach(async () => {
  await fs.remove(`${CWD}/ember-app-boilerplate/tmp`);
  await fs.mkdirp(`${CWD}/ember-app-boilerplate/tmp/assets`);
});

test.serial('buildMemserver() works', async (t) => {
  t.plan(15);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver();

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize === MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(memserverJSCode.startsWith('(function() {'));
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[295\.72 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(development) works', async (t) => {
  t.plan(15);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({ environment: 'development' });

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize === MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(memserverJSCode.startsWith('(function() {'));
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[295\.72 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(production) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'production', memserver: { enabled: true, minify: true }
  });

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_COMPRESSED_BUILD_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize === MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(stats.size === MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(memserverJSCode.includes('window.fetch='));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[127\.76 kB\] Environment: production/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(test) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'test', memserver: { enabled: true }
  });

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize === MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(stats.size === MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(memserverJSCode.includes('window.fetch = undefined'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[295\.72 kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(demo) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'demo', memserver: { enabled: true, minify: true }
  });

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_COMPRESSED_BUILD_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize === MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(stats.size === MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(memserverJSCode.includes('window.fetch='));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[127\.76 kB\] Environment: demo/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(custom) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'custom', memserver: { enabled: true }, modulePrefix: 'my-app'
  });

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize === MEMSERVER_JS_TARGET_BYTE_SIZE - 12);
  t.true(stats.size === MEMSERVER_JS_TARGET_BYTE_SIZE - 12);
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[295\.70 kB\] Environment: custom/g.test(message));

  mock.removeMock();
});


function getTimeTakenForBuild(message) {
  return Number(message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', ''));
}
