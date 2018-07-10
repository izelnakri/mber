// TODO: do actual building of test, production and memserver assets
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
import startHTTPServer from '../helpers/start-http-server';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const shell = promisify(exec);
const CWD = process.cwd();
const PROJECT_ROOT = `${process.cwd()}/dummyapp`;
const OUTPUT_INDEX_HTML = `${PROJECT_ROOT}/dist/index.html`;
const OUTPUT_PACKAGE_JSON = `${PROJECT_ROOT}/dist/package.json`;
const HTTP_PORT = 3000;
const APPLICATION_CSS_BUILD_TIME_TRESHOLD = 1200; // NOTE: maybe move these to a file
const APPLICATION_CSS_COMPRESSED_BUILD_TIME_TRESHOLD = 10000;
const VENDOR_JS_BUILD_TIME_TRESHOLD = 1500;
const VENDOR_JS_COMPRESSED_BUILD_TIME_TRESHOLD = 18000;
const APPLICATION_JS_BUILD_TIME_TRESHOLD = 1500;
const APPLICATION_JS_COMPRESSED_BUILD_TIME_TRESHOLD = 18000;
const MEMSERVER_JS_BUILD_TIME_TRESHOLD = 1500;
const MEMSERVER_JS_COMPRESSED_BUILD_TIME_TRESHOLD = 18000;

test.beforeEach(async () => {
  await fs.remove('dummyapp');
  // create a dummy model
  // c
  // add web request here
});

test.afterEach.always(async () => {
  await fs.remove('dummyapp');
});

// NOTE: any tests on fetch() ?
test.serial('$ mber build -> builds successfully', async (t) => {
  t.plan(31);

  const mock = mockProcessCWD(CWD);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const { stdout } = await shell(`node ${CWD}/cli.js build`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[2\.15 kB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[2\.59 MB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[12\.80 kB\] Environment: development/g.test(stdout));

  t.true(/ember BUNDLED: dummyapp in \d+ms/g.test(stdout));
  t.true(/Built project successfully\. Stored in "\.\/dist":/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.css: 2\.15 kB \[0\.67 kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.js: 12\.80 kB \[3\.59 kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: 2\.59 MB \[543\.66 kB gzipped\]/g.test(stdout));

  const [dist, indexHTMLBuffer, packageJSONExists] = await Promise.all([
    fs.readdir('./dummyapp/dist/assets'),
    fs.readFile(OUTPUT_INDEX_HTML),
    fs.exists(OUTPUT_PACKAGE_JSON) // we could read this
  ]);
  const indexHTML = indexHTMLBuffer.toString();

  t.true(dist.some((entity) => /application-\w+\.css/g.test(entity)));
  t.true(dist.some((entity) => /vendor-\w+\.js/g.test(entity)));
  t.true(dist.some((entity) => /application-\w+\.js/g.test(entity)));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
  t.true(packageJSONExists);

  let basicServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, { fastboot: false });
  const window = await injectBrowserToNode({ url: `http://localhost:${HTTP_PORT}` });

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  t.true(document.querySelector('#title').innerHTML === 'Congratulations, you made it!');
  t.deepEqual(Array.from(document.querySelectorAll('#users h4')).map((li) => li.innerHTML), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  basicServer.close();

  const fastbootServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, { fastboot: true });
  const html = await http.get(`http://localhost:${HTTP_PORT}`);
  const $ = cheerio.load(html);

  t.true($('#title').text() === 'Congratulations, you made it!');
  t.deepEqual($('#users h4').toArray().map((li) => $(li).text()), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  fastbootServer.close();

  mock.removeMock();
});

test.serial('$ mber build --env=production -> builds successfully', async (t) => {
  t.plan(31);

  const mock = mockProcessCWD(CWD);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const { stdout } = await shell(`node ${CWD}/cli.js build --env=production`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_COMPRESSED_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[1\.80 kB\] Environment: production/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_COMPRESSED_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[785\.43 kB\] Environment: production/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_COMPRESSED_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[9\.00 kB\] Environment: production/g.test(stdout));

  t.true(/ember BUNDLED: dummyapp in \d+ms/g.test(stdout));
  t.true(/Built project successfully\. Stored in "\.\/dist":/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.css: 1\.80 kB \[0\.63 kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.js: 9\.00 kB \[2\.88 kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: 785\.43 kB \[203\.18 kB gzipped\]/g.test(stdout));

  const [dist, indexHTMLBuffer, packageJSONExists] = await Promise.all([
    fs.readdir('./dummyapp/dist/assets'),
    fs.readFile(OUTPUT_INDEX_HTML),
    fs.exists(OUTPUT_PACKAGE_JSON) // we could read this
  ]);
  const indexHTML = indexHTMLBuffer.toString();

  t.true(dist.some((entity) => /application-\w+\.css/g.test(entity)));
  t.true(dist.some((entity) => /vendor-\w+\.js/g.test(entity)));
  t.true(dist.some((entity) => /application-\w+\.js/g.test(entity)));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
  t.true(packageJSONExists);

  let basicServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, { fastboot: false });
  const window = await injectBrowserToNode({ url: `http://localhost:${HTTP_PORT}` });

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  t.true(document.querySelector('#title').innerHTML === 'Congratulations, you made it!');
  t.deepEqual(Array.from(document.querySelectorAll('#users h4')).map((li) => li.innerHTML), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  basicServer.close();

  const fastbootServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, { fastboot: true });
  const html = await http.get(`http://localhost:${HTTP_PORT}`);
  const $ = cheerio.load(html);

  t.true($('#title').text() === 'Congratulations, you made it!');
  t.deepEqual($('#users h4').toArray().map((li) => $(li).text()), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  fastbootServer.close();

  mock.removeMock();
});

test.serial('$ mber build --env=test -> builds successfully', async (t) => {
  // TODO: shouldnt work with fastboot by default
  t.plan(31);

  const mock = mockProcessCWD(CWD);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets`)));

  const { stdout } = await shell(`node ${CWD}/cli.js build`, { cwd: PROJECT_ROOT });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[2\.15 kB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[2\.59 MB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[12\.80 kB\] Environment: development/g.test(stdout));

  t.true(/ember BUNDLED: dummyapp in \d+ms/g.test(stdout));
  t.true(/Built project successfully\. Stored in "\.\/dist":/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.css: 2\.15 kB \[0\.67 kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/application-\w+\.js: 12\.80 kB \[3\.59 kB gzipped\]/g.test(stdout));
  t.true(/- \.\/dist\/assets\/vendor-\w+\.js: 2\.59 MB \[543\.66 kB gzipped\]/g.test(stdout));

  const [dist, indexHTMLBuffer, packageJSONExists] = await Promise.all([
    fs.readdir('./dummyapp/dist/assets'),
    fs.readFile(OUTPUT_INDEX_HTML),
    fs.exists(OUTPUT_PACKAGE_JSON) // we could read this
  ]);
  const indexHTML = indexHTMLBuffer.toString();

  t.true(dist.some((entity) => /application-\w+\.css/g.test(entity)));
  t.true(dist.some((entity) => /vendor-\w+\.js/g.test(entity)));
  t.true(dist.some((entity) => /application-\w+\.js/g.test(entity)));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
  t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
  t.true(packageJSONExists);

  let basicServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, { fastboot: false });
  const window = await injectBrowserToNode({ url: `http://localhost:${HTTP_PORT}` });

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  t.true(document.querySelector('#title').innerHTML === 'Congratulations, you made it!');
  t.deepEqual(Array.from(document.querySelectorAll('#users h4')).map((li) => li.innerHTML), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  basicServer.close();

  const fastbootServer = await startHTTPServer(OUTPUT_INDEX_HTML, HTTP_PORT, { fastboot: true });
  const html = await http.get(`http://localhost:${HTTP_PORT}`);
  const $ = cheerio.load(html);

  t.true($('#title').text() === 'Congratulations, you made it!');
  t.deepEqual($('#users h4').toArray().map((li) => $(li).text()), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  fastbootServer.close();

  mock.removeMock();
});

// TODO: test memserver build

// TODO: test custom build

// TODO: fastboot false (2 tests)

// TODO: test build with watch, default port and it rebuilds

// TODO: test build with watch, different port and socketPort and it rebuilds
