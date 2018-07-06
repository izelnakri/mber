import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import createDummyApp from '../helpers/create-dummy-app';
import buildDistFolder from '../../lib/builders/build-dist-folder';
import fullBuild from '../../lib/builders/full-build';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/myapp`;
const EXAMPLE_ENV = require(`${CWD}/ember-app-boilerplate/config/environment.js`)('development');
// const INDEX_HTML_PATH = `${PROJECT_ROOT}/index.html`;

test.beforeEach(async () => {
  // TODO: continue from here, put results to stdout
  await fs.remove(`${CWD}/myapp`);
  await Promise.all([
    fs.remove(`${PROJECT_ROOT}/myapp/dist`),
    fs.remove(`${PROJECT_ROOT}/myapp/tmp`)
  ]);
  await createDummyApp('myapp');
});

test.afterEach.always(async () => {
  if (await fs.exists(`${CWD}/myapp`)) {
    await fs.remove(`${CWD}/myapp`);
  }
});

// const DUMMY_APP_PATH = `${CWD}/myapp`;

// const OUTPUT_PATH_DIST = '';
// const OUTPUT_PATH_TMP = '';

// const APPLICATION_JS_TARGET_BYTE_SIZE = 11537;
// const APPLICATION_JS_COMPRESSED_TARGET_BYTE_SIZE = 7990;

// different index.html endpoints(one from /tmp one from /dist)
// different buildConfig( { ENV, applicationName })
// test that buildDist resets /dist folder
// test time taken, file sizes and content
// files are hashed
// there is assetMap
// there is dist/index.html with hashed file references
// assets hashed but they are the same content
// assets gets reported on stdout
// test against the stdout

test.serial('buildDistFolder() works', async (t) => {
  t.plan(2);

  const mock = mockProcessCWD(PROJECT_ROOT);
  // const result = await Promise.all([
  //   fs.exists(APPLICATION_JS_OUTPUT_PATH),
  //   fs.exists(VENDOR_JS_OUTPUT_PATH),
  //   fs.exists(CSS_OUTPUT_PATH)
  // ]);
  // t.deepEqual(result, [false, false, false]);

  await fullBuild(PROJECT_ROOT, { ENV: EXAMPLE_ENV });
  const { message, stats } = await buildDistFolder(`${PROJECT_ROOT}/tmp/index.html`, {
    applicationName: 'myapp',
    ENV: EXAMPLE_ENV
  }); // add indexHTMLInjections if needed


  // const timeTakenForBuild = message.match(/application\.js in \d+ms/g)[0]
  //   .replace('application.js in ', '')
  //   .replace('ms', '')
  //
  // t.true(Number(timeTakenForBuild) < 500);
  //
  // const applicationJsStats = await fs.stat(`${CWD}/ember-app-boilerplate/tmp/assets/application.js`);
  //
  // t.true(applicationJsStats.size === APPLICATION_JS_TARGET_BYTE_SIZE);
  // t.true(stats.size === APPLICATION_JS_TARGET_BYTE_SIZE);
  //
  // t.true(/BUILT: application\.js in \d+ms \[0\.01 MB\] Environment: development/g.test(message));
  //
  mock.removeMock();
});
// test.serial('buildDistFolder() works for different applicationName and memserver mode', async (t) => {
//
// });
// test.serial('buildDistFolder() works for fastboot', async (t) => {
//
// });
// test.serial('buildDistFolder() works for different applicationName and memserver mode with fastboot', async (t) => {
//
// });

// TODO: test asset folder, index.html contents, package.json existance + contents, hashes


// TODO: for transpilers/transpile-index-html
// transpileIndexHTML() adds memserver for memserver //
// transpileIndexHTML() injects inline contents
