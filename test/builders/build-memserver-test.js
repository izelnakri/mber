import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import buildMemserver from '../../lib/builders/build-memserver.js';

const CWD = process.cwd();
const MEMSERVER_JS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/memserver.js`;
const MEMSERVER_JS_TARGET_BYTE_SIZE = 295982; // 295.98 kB
const MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE = 127809; // 127.81 kB

test.beforeEach(async () => {
  await fs.remove(MEMSERVER_JS_OUTPUT_PATH);
});

test.serial('buildMemserver() works', async (t) => {
  t.plan(15);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver();
  const timeTakenForBuild = message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 800);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJS = memserverJSBuffer.toString();
  const memserverJSCode = memserverJS.trim();

  t.true(memserverJSBuffer.length === MEMSERVER_JS_TARGET_BYTE_SIZE);
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
  t.true(/BUILT: memserver\.js in \d+ms \[295\.98 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(development) works', async (t) => {
  t.plan(15);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({ environment: 'development' });
  const timeTakenForBuild = message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 800);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJS = memserverJSBuffer.toString();
  const memserverJSCode = memserverJS.trim();

  t.true(memserverJSBuffer.length === MEMSERVER_JS_TARGET_BYTE_SIZE);
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
  t.true(/BUILT: memserver\.js in \d+ms \[295\.98 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(production) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'production', memserver: { enabled: true, minify: true }
  });
  const timeTakenForBuild = message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 7000);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJS = memserverJSBuffer.toString();
  const memserverJSCode = memserverJS.trim();

  t.true(memserverJSBuffer.length === MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE);
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
  t.true(/BUILT: memserver\.js in \d+ms \[127\.81 kB\] Environment: production/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(test) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'test', memserver: { enabled: true }
  });
  const timeTakenForBuild = message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 800);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJS = memserverJSBuffer.toString();
  const memserverJSCode = memserverJS.trim();

  t.true(memserverJSBuffer.length === MEMSERVER_JS_TARGET_BYTE_SIZE);
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
  t.true(/BUILT: memserver\.js in \d+ms \[295\.98 kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(demo) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'demo', memserver: { enabled: true, minify: true }
  });
  const timeTakenForBuild = message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 7000);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJS = memserverJSBuffer.toString();
  const memserverJSCode = memserverJS.trim();

  t.true(memserverJSBuffer.length === MEMSERVER_JS_COMPRESSED_TARGET_BYTE_SIZE);
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
  t.true(/BUILT: memserver\.js in \d+ms \[127\.81 kB\] Environment: demo/g.test(message));

  mock.removeMock();
});
test.serial('buildMemserver(custom) works', async (t) => {
  t.plan(14);

  t.true(!(await fs.exists(MEMSERVER_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, stats } = await buildMemserver({
    environment: 'custom', memserver: { enabled: true }, modulePrefix: 'my-app'
  });
  const timeTakenForBuild = message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 800);

  const memserverJSBuffer = await fs.readFile(MEMSERVER_JS_OUTPUT_PATH);
  const memserverJS = memserverJSBuffer.toString();
  const memserverJSCode = memserverJS.trim();

  t.true(memserverJSBuffer.length === MEMSERVER_JS_TARGET_BYTE_SIZE - 14);
  t.true(stats.size === MEMSERVER_JS_TARGET_BYTE_SIZE - 14);
  t.true(memserverJSCode.includes('window.fetch = undefined;'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/model'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver/response'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/initializers/memserver'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/server'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/initializer'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/fixtures/users'));
  t.true(codeIncludesAMDModule(memserverJSCode, 'my-app/memserver/models/user'));
  t.true(/BUILT: memserver\.js in \d+ms \[295\.97 kB\] Environment: custom/g.test(message));

  mock.removeMock();
});
