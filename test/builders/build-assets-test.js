import fs from 'fs-extra';
import test from 'ava';
import createDummyApp from '../helpers/create-dummy-app';
import buildAssets from '../../lib/builders/build-assets';
import mockProcessCWD from '../helpers/mock-process-cwd';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/myapp`;
const APPLICATION_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.js`;
const VENDOR_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/vendor.js`;
const CSS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.css`;
const MEMSERVER_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/memserver.js`;
const INDEX_HTML_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/index.html`;

test.beforeEach(async () => {
  await fs.remove(`${PROJECT_ROOT}/myapp`);
  await createDummyApp('myapp');
  await Promise.all([
    fs.remove(APPLICATION_JS_OUTPUT_PATH),
    fs.remove(VENDOR_JS_OUTPUT_PATH),
    fs.remove(CSS_OUTPUT_PATH),
    fs.remove(INDEX_HTML_OUTPUT_PATH),
    fs.remove(MEMSERVER_OUTPUT_PATH)
  ])
});

test.afterEach.always(async () => {
  if (await fs.exists('myapp')) {
    await fs.remove('myapp');
  }
});

test.serial('buildAssets(projectRoot, buildConfig) works', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = require(`${PROJECT_ROOT}/config/environment.js`);
  const result = await Promise.all([
    fs.exists(APPLICATION_JS_OUTPUT_PATH),
    fs.exists(VENDOR_JS_OUTPUT_PATH),
    fs.exists(CSS_OUTPUT_PATH),
    fs.exists(INDEX_HTML_OUTPUT_PATH),
    fs.exists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(result, [false, false, false, false, false]);

  await buildAssets(PROJECT_ROOT, {
    ENV: environmentFunction('development'),
    entrypoint: `${PROJECT_ROOT}/index.html`
  });

  const postResult = await Promise.all([
    fs.exists(APPLICATION_JS_OUTPUT_PATH),
    fs.exists(VENDOR_JS_OUTPUT_PATH),
    fs.exists(CSS_OUTPUT_PATH),
    fs.exists(INDEX_HTML_OUTPUT_PATH),
    fs.exists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(postResult, [true, true, true, true, false]);

  mock.removeMock();
});

test.serial('buildAssets(projectRoot, buildConfig) works when tmp folder does not exist', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = require(`${PROJECT_ROOT}/config/environment.js`);

  await fs.remove(`${PROJECT_ROOT}/tmp`);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp`)));

  await buildAssets(PROJECT_ROOT, {
    ENV: environmentFunction('development'),
    entrypoint: `${PROJECT_ROOT}/index.html`
  });

  const postResult = await Promise.all([
    fs.exists(APPLICATION_JS_OUTPUT_PATH),
    fs.exists(VENDOR_JS_OUTPUT_PATH),
    fs.exists(CSS_OUTPUT_PATH),
    fs.exists(INDEX_HTML_OUTPUT_PATH),
    fs.exists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(postResult, [true, true, true, true, false]);

  mock.removeMock();
});

// test.serial('buildAssets(projectRoot, buildConfig) ignoreIndexHTML works', async (t) => {
//   t.plan(2);
//
//   const mock = mockProcessCWD(PROJECT_ROOT);
//   const environmentFunction = require(`${PROJECT_ROOT}/config/environment.js`);
//
//   await fs.remove(`${PROJECT_ROOT}/tmp`);
//
//   t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp`)));
//
//   await buildAssets(PROJECT_ROOT, {
//     ENV: environmentFunction('development'),
//     entrypoint: `${PROJECT_ROOT}/index.html`,
//     ignoreIndexHTML: true
//   });
//
//   const postResult = await Promise.all([
//     fs.exists(APPLICATION_JS_OUTPUT_PATH),
//     fs.exists(VENDOR_JS_OUTPUT_PATH),
//     fs.exists(CSS_OUTPUT_PATH),
//     fs.exists(INDEX_HTML_OUTPUT_PATH),
//     fs.exists(MEMSERVER_OUTPUT_PATH)
//   ]);
//
//   t.deepEqual(postResult, [true, true, true, false, false]);
//
//   mock.removeMock();
// });

test.serial('buildAssets(projectRoot, buildConfig) with memserver works', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = require(`${PROJECT_ROOT}/config/environment.js`);

  await fs.remove(`${PROJECT_ROOT}/tmp`);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp`)));

  await buildAssets(PROJECT_ROOT, {
    ENV: environmentFunction('memserver'),
    entrypoint: `${PROJECT_ROOT}/index.html`,
  });

  const postResult = await Promise.all([
    fs.exists(APPLICATION_JS_OUTPUT_PATH),
    fs.exists(VENDOR_JS_OUTPUT_PATH),
    fs.exists(CSS_OUTPUT_PATH),
    fs.exists(INDEX_HTML_OUTPUT_PATH),
    fs.exists(MEMSERVER_OUTPUT_PATH)
  ]);

  t.deepEqual(postResult, [true, true, true, true, true]);

  mock.removeMock();
});

test.serial('buildAssets(projectRoot, buildConfig) works for different endpoint', async (t) => {
  t.plan(9);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = require(`${PROJECT_ROOT}/config/environment.js`);

  await fs.remove(`${PROJECT_ROOT}/tmp`);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp`)));

  await buildAssets(PROJECT_ROOT, {
    ENV: environmentFunction('test'),
    entrypoint: `${PROJECT_ROOT}/tests/index.html`
  });

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
    return fs.exists(`${PROJECT_ROOT}/tmp/${targetFile}`);
  }));

  t.deepEqual(postResult, [true, true, true, true, false, false, false]);

  const indexHTML = (await fs.readFile(`${PROJECT_ROOT}/tmp/index.html`)).toString();

  targetFiles.forEach((targetFile) => {
    t.true(indexHTML.includes(targetFile));
  })

  mock.removeMock();
});
