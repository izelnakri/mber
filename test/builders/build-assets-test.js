import fs from 'fs/promises';
import test from 'ava';
import createDummyApp from '../helpers/create-dummy-app.js';
import buildAssets from '../../lib/builders/build-assets.js';
import WorkerPool from '../../lib/worker-pool/index.js';
import pathExists from '../../lib/utils/path-exists.js';
import mockProcessCWD from '../helpers/mock-process-cwd.js';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/myapp`;
const APPLICATION_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.js`;
const VENDOR_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/vendor.js`;
const CSS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.css`;
const MEMSERVER_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/memserver.js`;
const INDEX_HTML_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/index.html`;

test.beforeEach(async () => {
  global.MBER_THREAD_POOL = WorkerPool.start();

  await fs.rm(`${PROJECT_ROOT}/myapp`, { recursive: true, force: true });
  await createDummyApp('myapp');
  await Promise.all([
    fs.rm(APPLICATION_JS_OUTPUT_PATH, { force: true, recursive: true }),
    fs.rm(VENDOR_JS_OUTPUT_PATH, { force: true, recursive: true }),
    fs.rm(CSS_OUTPUT_PATH, { force: true, recursive: true }),
    fs.rm(INDEX_HTML_OUTPUT_PATH, { force: true, recursive: true }),
    fs.rm(MEMSERVER_OUTPUT_PATH, { force: true, recursive: true })
  ]);
});

test.afterEach.always(async () => {
  if (await pathExists('myapp')) {
    await fs.rm('myapp', { recursive: true, force: true });
  }

  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});

test.serial('buildAssets(projectRoot, buildConfig) works', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = (await import(`${PROJECT_ROOT}/config/environment.js`)).default;
  const result = await Promise.all([
    pathExists(APPLICATION_JS_OUTPUT_PATH),
    pathExists(VENDOR_JS_OUTPUT_PATH),
    pathExists(CSS_OUTPUT_PATH),
    pathExists(INDEX_HTML_OUTPUT_PATH),
    pathExists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(result, [false, false, false, false, false]);

  await buildAssets({
    projectRoot: PROJECT_ROOT,
    ENV: environmentFunction('development')
  }, false);

  const postResult = await Promise.all([
    pathExists(APPLICATION_JS_OUTPUT_PATH),
    pathExists(VENDOR_JS_OUTPUT_PATH),
    pathExists(CSS_OUTPUT_PATH),
    pathExists(INDEX_HTML_OUTPUT_PATH),
    pathExists(MEMSERVER_OUTPUT_PATH),
    pathExists(`${PROJECT_ROOT}/tmp/assets/tests.js`),
    pathExists(`${PROJECT_ROOT}/tmp/assets/test-support.js`),
    pathExists(`${PROJECT_ROOT}/tmp/assets/test-support.css`),
    pathExists(`${PROJECT_ROOT}/tmp/package.json`),
  ]);

  t.deepEqual(postResult, [true, true, true, true, false, false, false, false, true]);

  mock.removeMock();
});

test.serial('buildAssets(projectRoot, buildConfig) works when tmp folder does not exist', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = (await import(`${PROJECT_ROOT}/config/environment.js`)).default;

  await fs.rm(`${PROJECT_ROOT}/tmp`, { recursive: true, force: true });

  t.true(!(await pathExists(`${PROJECT_ROOT}/tmp`)));

  await buildAssets({
    projectRoot: PROJECT_ROOT,
    ENV: environmentFunction('development'),
    entrypoint: `${PROJECT_ROOT}/index.html`
  }, false);

  const postResult = await Promise.all([
    pathExists(APPLICATION_JS_OUTPUT_PATH),
    pathExists(VENDOR_JS_OUTPUT_PATH),
    pathExists(CSS_OUTPUT_PATH),
    pathExists(INDEX_HTML_OUTPUT_PATH),
    pathExists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(postResult, [true, true, true, true, false]);

  mock.removeMock();
});

test.serial('buildAssets(projectRoot, buildConfig) with memserver works', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = (await import(`${PROJECT_ROOT}/config/environment.js`)).default;

  await fs.rm(`${PROJECT_ROOT}/tmp`, { recursive: true, force: true });

  t.true(!(await pathExists(`${PROJECT_ROOT}/tmp`)));

  await buildAssets({
    projectRoot: PROJECT_ROOT,
    ENV: environmentFunction('memserver')
  }, false);

  const postResult = await Promise.all([
    pathExists(APPLICATION_JS_OUTPUT_PATH),
    pathExists(VENDOR_JS_OUTPUT_PATH),
    pathExists(CSS_OUTPUT_PATH),
    pathExists(INDEX_HTML_OUTPUT_PATH),
    pathExists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(postResult, [true, true, true, true, true]);

  mock.removeMock();
});

test.serial('buildAssets(projectRoot, buildConfig) works for testing', async (t) => {
  t.plan(10);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = (await import(`${PROJECT_ROOT}/config/environment.js`)).default;

  await fs.rm(`${PROJECT_ROOT}/tmp`, { recursive: true, force: true });

  t.true(!(await pathExists(`${PROJECT_ROOT}/tmp`)));

  await buildAssets({
    projectRoot: PROJECT_ROOT,
    cliArguments: { testing: true },
    ENV: environmentFunction('test'),
  }, false);

  const targetFiles = [
    'assets/application.js',
    'assets/vendor.js',
    'assets/application.css',
    'assets/memserver.js',
    'assets/test-support.css',
    'assets/test-support.js',
    'assets/tests.js'
  ];
  const postResult = await Promise.all(targetFiles.map((targetFile) => {
    return pathExists(`${PROJECT_ROOT}/tmp/${targetFile}`);
  }));

  t.deepEqual(postResult, [true, true, true, true, true, true, true]);

  const testsHTML = (await fs.readFile(`${PROJECT_ROOT}/tmp/tests.html`)).toString();

  targetFiles.forEach((targetFile) => {
    t.true(testsHTML.includes(targetFile));
  })

  t.true((await pathExists(`${PROJECT_ROOT}/tmp/package.json`)));

  mock.removeMock();
});
