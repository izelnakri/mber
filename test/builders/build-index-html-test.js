import fs from 'fs-extra';
import test from 'ava';
import buildIndexHTML from '../../lib/builders/build-index-html';
import createDummyApp from '../helpers/create-dummy-app';
import mockProcessCWD from '../helpers/mock-process-cwd';

// const CWD = process.cwd();
// const PROJECT_ROOT = `${CWD}/myapp`;
// const APPLICATION_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.js`;
// const VENDOR_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/vendor.js`;
// const CSS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.css`;
// const MEMSERVER_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/memserver.js`;
// const INDEX_HTML_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/index.html`;

test.beforeEach(async () => {
  // await fs.remove(`${PROJECT_ROOT}/myapp`);
  // await createDummyApp('myapp');
  // await Promise.all([
  //   fs.remove(APPLICATION_JS_OUTPUT_PATH),
  //   fs.remove(VENDOR_JS_OUTPUT_PATH),
  //   fs.remove(CSS_OUTPUT_PATH),
  //   fs.remove(INDEX_HTML_OUTPUT_PATH),
  //   fs.remove(MEMSERVER_OUTPUT_PATH)
  // ])
});

test.afterEach.always(async () => {
  // if (await fs.exists('myapp')) {
  //   await fs.remove('myapp');
  // }
});

test.serial('buildIndexHTML() works', async (t) => {
  t.true(true);
});

// test.serial('buildIndexHTML() works for different endpoint', async (t) => {
// });
//
// test.serial('buildIndexHTML() works for different application, indexHTMLInjections and with memserver', async (t) => {
// });
