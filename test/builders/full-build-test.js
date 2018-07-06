import fs from 'fs-extra';
import test from 'ava';
import createDummyApp from '../helpers/create-dummy-app';
import fullBuild from '../../lib/builders/full-build';
import mockProcessCWD from '../helpers/mock-process-cwd';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/myapp`;
const APPLICATION_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.js`;
const VENDOR_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/vendor.js`;
const CSS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.css`;

test.beforeEach(async () => {
  await fs.remove(`${PROJECT_ROOT}/myapp`);
  await createDummyApp('myapp');
  await Promise.all([
    fs.remove(APPLICATION_JS_OUTPUT_PATH),
    fs.remove(VENDOR_JS_OUTPUT_PATH),
    fs.remove(CSS_OUTPUT_PATH)
  ])
});

test.afterEach.always(async () => {
  if (await fs.exists('myapp')) {
    await fs.remove('myapp');
  }
});

test.serial('fullBuild(projectRoot, buildConfig) works', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const environmentFunction = require(`${PROJECT_ROOT}/config/environment.js`);
  const result = await Promise.all([
    fs.exists(APPLICATION_JS_OUTPUT_PATH),
    fs.exists(VENDOR_JS_OUTPUT_PATH),
    fs.exists(CSS_OUTPUT_PATH)
  ]);
  t.deepEqual(result, [false, false, false]);

  await fullBuild(PROJECT_ROOT, { ENV: environmentFunction('development') });

  const postResult = await Promise.all([
    fs.exists(APPLICATION_JS_OUTPUT_PATH),
    fs.exists(VENDOR_JS_OUTPUT_PATH),
    fs.exists(CSS_OUTPUT_PATH)
  ]);

  t.deepEqual(postResult, [true, true, true]);

  mock.removeMock();
});
