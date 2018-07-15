import cheerio from 'cheerio';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';
import test from 'ava';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
import http from '../helpers/http';
import mockProcessCWD from '../helpers/mock-process-cwd';
import {
  getTimeTakenForApplicationCSS,
  getTimeTakenForApplicationJS,
  getTimeTakenForVendorJS,
  getTimeTakenForMemServerJS
} from '../helpers/parse-time-taken-for-build';
import {
  APPLICATION_CSS_BUILD_TIME_TRESHOLD,
  APPLICATION_CSS_COMPRESSED_BUILD_TIME_TRESHOLD,
  VENDOR_JS_BUILD_TIME_TRESHOLD,
  VENDOR_JS_COMPRESSED_BUILD_TIME_TRESHOLD,
  APPLICATION_JS_BUILD_TIME_TRESHOLD,
  APPLICATION_JS_COMPRESSED_BUILD_TIME_TRESHOLD,
  MEMSERVER_JS_BUILD_TIME_TRESHOLD
} from '../helpers/asset-build-thresholds';
import startHTTPServer from '../helpers/start-http-server';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const shell = promisify(exec);
const CWD = process.cwd();
const PROJECT_ROOT = `${process.cwd()}/dummyapp`;
const OUTPUT_INDEX_HTML = `${PROJECT_ROOT}/dist/index.html`;
const OUTPUT_PACKAGE_JSON = `${PROJECT_ROOT}/dist/package.json`;
const HTTP_PORT = 3000;

test.beforeEach(async () => {
  await fs.remove('dummyapp');
});

test.afterEach.always(async () => {
  await fs.remove('dummyapp');
});

test.serial('$ mber build -> builds successfully', async (t) => {
  t.plan(31);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout } = await shell(`node ${CWD}/cli.js build`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: \d+\.\d+ MB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  await testSuccessfullBuild(t, stdout, { memserver: false, fastboot: true });

  mock.removeMock();
});

test.serial('$ mber build --env=production -> builds successfully', async (t) => {
  t.plan(31);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout } = await shell(`node ${CWD}/cli.js build --env=production`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_COMPRESSED_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: production/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_COMPRESSED_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ kB\] Environment: production/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_COMPRESSED_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: production/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: \d+\.\d+ kB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  await testSuccessfullBuild(t, stdout, { memserver: false, fastboot: true });

  mock.removeMock();
});

test.serial('$ mber build --env=memserver -> builds successfully', async (t) => {
  t.plan(36);

  await createAdvancedDummyApp('dummyapp', { memserver: true });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout } = await shell(`node ${CWD}/cli.js build --env=memserver`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: memserver/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: memserver.js...'));
  t.true(getTimeTakenForMemServerJS(stdout) < MEMSERVER_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: memserver\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: \d+\.\d+ MB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  await testSuccessfullBuild(t, stdout, { memserver: true, fastboot: true });

  mock.removeMock();
});

test.serial('$ mber build --env=custom -> builds successfully', async (t) => {
  t.plan(31);

  await createAdvancedDummyApp('dummyapp', { memserver: true });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout } = await shell(`node ${CWD}/cli.js build --env=custom`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: custom/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: custom/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: custom/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: \d+\.\d+ MB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  await testSuccessfullBuild(t, stdout, { memserver: false, fastboot: true });

  mock.removeMock();
});

test.serial('$ mber build --fastboot=false -> builds successfully', async (t) => {
  t.plan(26);

  await createAdvancedDummyApp('dummyapp', { memserver: true });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout } = await shell(`node ${CWD}/cli.js build --fastboot=false`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: \d+\.\d+ MB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  await testSuccessfullBuild(t, stdout, { memserver: false, fastboot: false });

  mock.removeMock();
});

test.serial('$ mber build --env=memserver --fastboot=false -> builds successfully', async (t) => {
  t.plan(31);

  await createAdvancedDummyApp('dummyapp', { memserver: true });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout } = await shell(`node ${CWD}/cli.js build --env=memserver --fastboot=false`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: memserver/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: memserver.js...'));
  t.true(getTimeTakenForMemServerJS(stdout) < MEMSERVER_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: memserver\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: \d+\.\d+ MB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  await testSuccessfullBuild(t, stdout, { memserver: true, fastboot: false });

  mock.removeMock();
});

// NOTE: any tests on fetch() ?
// TODO: test build with watch, default port and it rebuilds
// TODO: test build with watch, different port and socketPort and it rebuilds

async function testSuccessfullBuild(t, stdout, options={ memserver: false, fastboot: true }) {
  console.log('stdout is', stdout);

  t.true(/ember BUNDLED: dummyapp in \d+ms/g.test(stdout));
  t.true(/Built project successfully\. Stored in "\.\/dist":/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.css: \d+\.\d+ kB \[\d+\.\d+ kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.js: \d+\.\d+ kB \[\d+\.\d+ kB gzipped\]/g.test(stdout));

  const [dist, indexHTMLBuffer, packageJSONExists] = await Promise.all([
    fs.readdir('./dummyapp/dist/assets'),
    fs.readFile(OUTPUT_INDEX_HTML),
    fs.exists(OUTPUT_PACKAGE_JSON)
  ]);
  const indexHTML = indexHTMLBuffer.toString();

  t.true(dist.some((entity) => /application-\w+\.css/g.test(entity)));
  t.true(dist.some((entity) => /vendor-\w+\.js/g.test(entity)));
  t.true(dist.some((entity) => /application-\w+\.js/g.test(entity)));

  if (options.memserver) {
    t.true(/- \.\/dist\/assets\/memserver-\w+\.js: \d+\.\d+ kB \[\d+\.\d+ kB gzipped\]/g.test(stdout));
    t.true(dist.some((entity) => /memserver-\w+\.js/g.test(entity)));
  }

  options.fastboot ? t.true(packageJSONExists) : t.true(!packageJSONExists);
  if (options.fastboot) {
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
  }

  let basicServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, Object.assign({}, options, {
    fastboot: false
  }));
  const window = await injectBrowserToNode({ url: `http://localhost:${HTTP_PORT}` });

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  t.true(window.document.querySelector('#title').innerHTML === 'Congratulations, you made it!');
  t.deepEqual(Array.from(window.document.querySelectorAll('#users h4')).map((li) => li.innerHTML), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  basicServer.close();

  if (options.fastboot) {
    const fastbootServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, options);
    const html = await http.get(`http://localhost:${HTTP_PORT}`);
    const $ = cheerio.load(html);

    console.log('html is', html);

    t.true($('#title').text() === 'Congratulations, you made it!');
    t.deepEqual($('#users h4').toArray().map((li) => $(li).text()), [
      'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
    ]);

    fastbootServer.close();
  }
}
