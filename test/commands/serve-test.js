import { exec } from 'child_process';
import cheerio from 'cheerio';
import fs from 'fs-extra';
import test from 'ava';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
import http from '../helpers/http';
import killProcessOnPort from '../helpers/kill-process-on-port';
import mockProcessCWD from '../helpers/mock-process-cwd';
import startBackendAPIServer from '../helpers/start-backend-api-server';
import injectTestContentToHTML from '../helpers/inject-test-content-to-hbs';
import {
  getTimeTakenForApplicationCSS,
  getTimeTakenForApplicationJS,
  getTimeTakenForVendorJS,
  getTimeTakenForMemServerJS
} from '../helpers/parse-time-taken-for-build';
import {
  APPLICATION_CSS_BUILD_TIME_THRESHOLD,
  APPLICATION_CSS_COMPRESSED_BUILD_TIME_THRESHOLD,
  VENDOR_JS_BUILD_TIME_THRESHOLD,
  VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD,
  APPLICATION_JS_BUILD_TIME_THRESHOLD,
  APPLICATION_JS_COMPRESSED_BUILD_TIME_THRESHOLD,
  MEMSERVER_JS_BUILD_TIME_THRESHOLD
} from '../helpers/asset-build-thresholds';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const CWD = process.cwd();
const PROJECT_ROOT = `${process.cwd()}/dummyapp`;
const OUTPUT_INDEX_HTML = `${PROJECT_ROOT}/tmp/index.html`;
const OUTPUT_PACKAGE_JSON = `${PROJECT_ROOT}/tmp/package.json`;
const HTTP_PORT = 1234;
const CONTENT_TO_INJECT = '<h1 id="inject">injectedTestcontent</h1>'

let childProcessTree = [];

test.beforeEach(async () => {
  await fs.remove('dummyapp');
  await killProcessOnPort(HTTP_PORT);
});

test.afterEach.always(async () => {
  childProcessTree.forEach((childProcess) => childProcess.kill('SIGKILL'));
  childProcessTree.length = 0; // NOTE: JS trick: reset without replacing an array in memory

  await fs.remove('dummyapp');
  await killProcessOnPort(HTTP_PORT);
});

test.serial('$ mber serve -> builds and watches successfully', async (t) => {
  t.plan(48);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const server = await startBackendAPIServer(3000);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js serve`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_THRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: development/g.test(stdout));
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));

  let { html, document } = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: true });

  t.true(!document.querySelector('html').innerHTML.includes(CONTENT_TO_INJECT));
  t.true(!html.includes(CONTENT_TO_INJECT));

  const { stdoutAfterInjection } = await injectTestContentToHTML(PROJECT_ROOT, CONTENT_TO_INJECT, childProcess);

  t.true(stdoutAfterInjection.includes('ember CHANGED: /src/ui/routes/index/template.hbs'));
  t.true(stdoutAfterInjection.includes('ember BUILDING: application.js...'));
  t.true(stdoutAfterInjection.includes('ember BUILT: application.js'));

  const result = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: true });
  const newHTML = result.html;

  t.true(newHTML.includes(CONTENT_TO_INJECT));

  server.close();
  childProcess.kill('SIGKILL');
  mock.removeMock();
});

test.serial('$ mber serve --env=production -> serves successfully', async (t) => {
  t.plan(28);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const server = await startBackendAPIServer(3000);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js serve --env=production`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_COMPRESSED_BUILD_TIME_THRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: production/g.test(stdout));
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ kB\] Environment: production/g.test(stdout));
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: production/g.test(stdout));

  let { html, document } = await testSuccessfullServe(t, stdout, {
    memserver: false, fastboot: true
  });

  t.true(!document.querySelector('html').innerHTML.includes(CONTENT_TO_INJECT));
  t.true(!html.includes(CONTENT_TO_INJECT));

  server.close();
  childProcess.kill('SIGKILL');
  mock.removeMock();
});

test.serial('$ mber serve --env=memserver -> serves successfully', async (t) => {
  t.plan(53);

  await createAdvancedDummyApp('dummyapp', { memserver: true });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js s --env=memserver`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(stdout.includes('ember BUILDING: memserver.js...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForMemServerJS(stdout) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: memserver/g.test(stdout));
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(/ember BUILT: memserver\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));

  let { html, document } = await testSuccessfullServe(t, stdout, { memserver: true, fastboot: true });

  t.true(!document.querySelector('html').innerHTML.includes(CONTENT_TO_INJECT));
  t.true(!html.includes(CONTENT_TO_INJECT));

  const { stdoutAfterInjection } = await injectTestContentToHTML(PROJECT_ROOT, CONTENT_TO_INJECT, childProcess);

  t.true(stdoutAfterInjection.includes('ember CHANGED: /src/ui/routes/index/template.hbs'));
  t.true(stdoutAfterInjection.includes('ember BUILDING: application.js...'));
  t.true(stdoutAfterInjection.includes('ember BUILT: application.js'));

  const result = await testSuccessfullServe(t, stdout, { memserver: true, fastboot: true });
  const newHTML = result.html;

  t.true(newHTML.includes(CONTENT_TO_INJECT));

  childProcess.kill('SIGKILL');
  mock.removeMock();
});

test.serial('$ mber serve --env=custom -> serves successfully', async (t) => {
  t.plan(48);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const server = await startBackendAPIServer(3000);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js serve --env=custom`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_THRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: custom/g.test(stdout));
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: custom/g.test(stdout));
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: custom/g.test(stdout));

  let { html, document } = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: true });

  t.true(!document.querySelector('html').innerHTML.includes(CONTENT_TO_INJECT));
  t.true(!html.includes(CONTENT_TO_INJECT));

  const { stdoutAfterInjection } = await injectTestContentToHTML(PROJECT_ROOT, CONTENT_TO_INJECT, childProcess);

  t.true(stdoutAfterInjection.includes('ember CHANGED: /src/ui/routes/index/template.hbs'));
  t.true(stdoutAfterInjection.includes('ember BUILDING: application.js...'));
  t.true(stdoutAfterInjection.includes('ember BUILT: application.js'));

  const result = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: true });
  const newHTML = result.html;

  t.true(newHTML.includes(CONTENT_TO_INJECT));

  server.close();
  childProcess.kill('SIGKILL');
  mock.removeMock();
});

test.serial('$ mber serve --fastboot=false -> serves successfully', async (t) => {
  t.plan(38);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const server = await startBackendAPIServer(3000);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js serve --fastboot=false`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_THRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: development/g.test(stdout));
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));

  let { html, document } = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: false });

  t.true(!document.querySelector('html').innerHTML.includes(CONTENT_TO_INJECT));
  t.true(!html.includes(CONTENT_TO_INJECT));

  const { stdoutAfterInjection } = await injectTestContentToHTML(PROJECT_ROOT, CONTENT_TO_INJECT, childProcess);

  t.true(stdoutAfterInjection.includes('ember CHANGED: /src/ui/routes/index/template.hbs'));
  t.true(stdoutAfterInjection.includes('ember BUILDING: application.js...'));
  t.true(stdoutAfterInjection.includes('ember BUILT: application.js'));

  const result = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: false });
  const newHTML = result.html;

  t.true(newHTML.includes(CONTENT_TO_INJECT));

  server.close();
  childProcess.kill('SIGKILL');
  mock.removeMock();
});

test.serial('$ mber serve --env=memserver --fastboot=false -> builds successfully', async (t) => {
  t.plan(43);

  await createAdvancedDummyApp('dummyapp', { memserver: true });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js serve --env=memserver --fastboot=false`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(stdout.includes('ember BUILDING: memserver.js...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_THRESHOLD);
  t.true(getTimeTakenForMemServerJS(stdout) < MEMSERVER_JS_BUILD_TIME_THRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: memserver/g.test(stdout));
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));
  t.true(/ember BUILT: memserver\.js in \d+ms \[\d+\.\d+ kB\] Environment: memserver/g.test(stdout));

  let { html, document } = await testSuccessfullServe(t, stdout, { memserver: true, fastboot: false });

  t.true(!document.querySelector('html').innerHTML.includes(CONTENT_TO_INJECT));
  t.true(!html.includes(CONTENT_TO_INJECT));

  const { stdoutAfterInjection } = await injectTestContentToHTML(PROJECT_ROOT, CONTENT_TO_INJECT, childProcess);

  t.true(stdoutAfterInjection.includes('ember CHANGED: /src/ui/routes/index/template.hbs'));
  t.true(stdoutAfterInjection.includes('ember BUILDING: application.js...'));
  t.true(stdoutAfterInjection.includes('ember BUILT: application.js'));

  const result = await testSuccessfullServe(t, stdout, { memserver: true, fastboot: false });
  const newHTML = result.html;

  t.true(newHTML.includes(CONTENT_TO_INJECT));

  mock.removeMock();
  childProcess.kill('SIGKILL');
});

// TODO: different port and socketPort

async function spawnProcess(command, options) {
  return new Promise((resolve, reject) => {
    let stdout = [];
    let childProcess = exec(command, options);

    childProcessTree.push(childProcess);
    childProcess.stdout.on('data', (data) => {
      stdout.push(data);
      // TODO: this causes problems in the CI
      if (data.includes('Server is running on http://localhost:')) {
        setTimeout(() => {
          const result = stdout.join('');
          console.log('stdout is');
          console.log(result);
          resolve({ stdout: result, childProcess });
        }, 1000);
      }
    });
    childProcess.stderr.on('data', (data) => {
      console.log('SPAWNED PROCESS STDERR ERROR:');
      console.log(data);
      // resolve(data);
    });

    setTimeout(() => {
      console.log('SPAWNED PROCESS RETURNS STDOUT FROM TIMEOUT...');
      const result = stdout.join('');
      console.log('stdout is');
      console.log(result);
      resolve({ stdout: result, childProcess });
    }, 50000);
  });
}

async function testSuccessfullServe(t, stdout, options={ memserver: false, fastboot: true }) {
  const [tmpAssetsFolder, indexHTMLBuffer, packageJSONExists] = await Promise.all([
    fs.readdir('./dummyapp/tmp/assets'),
    fs.readFile(OUTPUT_INDEX_HTML),
    fs.exists(OUTPUT_PACKAGE_JSON)
  ]);
  const indexHTML = indexHTMLBuffer.toString();

  t.true(tmpAssetsFolder.some((entity) => /application\.css/g.test(entity)));
  t.true(tmpAssetsFolder.some((entity) => /vendor\.js/g.test(entity)));
  t.true(tmpAssetsFolder.some((entity) => /application\.js/g.test(entity)));

  if (options.memserver) {
    t.true(tmpAssetsFolder.some((entity) => /memserver\.js/g.test(entity)));
  }

  t.true(packageJSONExists);

  if (options.fastboot) {
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
  }

  const window = await injectBrowserToNode({ url: `http://localhost:${HTTP_PORT}` });

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  t.true(document.querySelector('#title').innerHTML === 'Congratulations, you made it!');
  t.deepEqual(Array.from(document.querySelectorAll('#users h4')).map((li) => li.innerHTML), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  if (options.fastboot) {
    const html = await http.get(`http://localhost:${HTTP_PORT}`);
    const $ = cheerio.load(html);

    console.log('html is', html);

    t.true($('#title').text() === 'Congratulations, you made it!');
    t.deepEqual($('#users h4').toArray().map((li) => $(li).text()), [
      'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
    ]);

    return { html, document: document };
  }

  return { html: document.querySelector('html').innerHTML, document: document };
}
// ember TypeError: Cannot read property 'registerWaiter' of undefined
// TypeError: Cannot read property 'registerWaiter' of undefined
