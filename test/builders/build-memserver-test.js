import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import buildMemserver from '../../lib/builders/build-memserver.js';
import WorkerPool from '../../lib/worker-pool';
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
  global.MBER_THREAD_POOL = WorkerPool.start();

  await fs.remove(`${CWD}/ember-app-boilerplate/tmp`);
  await fs.mkdirp(`${CWD}/ember-app-boilerplate/tmp/assets`);
});

test.afterEach.always(async () => {
  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});

test.serial('buildMemserver() works', async (t) => {
  t.plan(15);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver();

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverJSBuffer.length >= MEMSERVER_JS_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= MEMSERVER_JS_TARGET_BYTE_SIZE - 1000);
  t.true(memserverJSCode.startsWith('(function() {'));
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/instance-initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[241.\d+ kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(development) works', async (t) => {
  t.plan(15);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({ ENV: { environment: 'development' } }, false);

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverJSBuffer.length >= MEMSERVER_JS_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= MEMSERVER_JS_TARGET_BYTE_SIZE - 1000);
  t.true(memserverJSCode.startsWith('(function() {'));
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/instance-initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[241.\d+ kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(production) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    ENV: { environment: 'production', memserver: { enabled: true, minify: true } }
  }, false);

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_COMPRESSED_BUILD_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize >= MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE - 1000);
  t.true(memserverJSCode.includes('window.fetch='));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/instance-initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[102.\d+ kB\] Environment: production/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(test) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    ENV: { environment: 'test', memserver: { enabled: true } }
  }, false);

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize >= MEMSERVER_JS_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= MEMSERVER_JS_TARGET_BYTE_SIZE - 1000);
  t.true(memserverJSCode.includes('window.fetch = undefined'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/instance-initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[241.\d+ kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(demo) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    ENV: { environment: 'demo', memserver: { enabled: true, minify: true } }
  }, false);

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_COMPRESSED_BUILD_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize >= MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE - 1000);
  t.true(memserverJSCode.includes('window.fetch='));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/instance-initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'frontend/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[102.\d+ kB\] Environment: demo/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(custom) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    ENV: { environment: 'custom', memserver: { enabled: true }, modulePrefix: 'my-app' }
  }, false);

  t.true(getTimeTakenForBuild(message) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverSize = memserverJSBuffer.length;
  const memserverJSCode = memserverJSBuffer.toString().trim();

  t.true(memserverSize < MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(stats.size < MEMSERVER_JS_TARGET_BYTE_SIZE);
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/instance-initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[241.\d+ kB\] Environment: custom/g.test(message));

  mock.removeMock();
});


function getTimeTakenForBuild(message) {
  return Number(message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', ''));
}
