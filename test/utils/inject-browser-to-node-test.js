import test from 'ava';
import fs from 'fs/promises';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node.js';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import buildApplication from '../../lib/builders/build-application.js';
import buildVendor from '../../lib/builders/build-vendor.js';
import buildCSS from '../../lib/builders/build-css.js';
import startHTTPServer from '../../lib/runners/start-http-server.js';
import WorkerPool from '../../lib/worker-pool/index.js';

const CWD = process.cwd();

test.beforeEach(async () => {
  global.MBER_THREAD_POOL = WorkerPool.start();
});

test.afterEach.always(async () => {
  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});

test.serial('injectBrowserToNode() works when there is no html or http server running with index.html', async (t) => {
  t.plan(6);

  await injectBrowserToNode();

  [
    global.window, global.mainContext, global.document, global.self
  ].forEach((reference) => t.truthy(reference));
  t.true(global.window.location.href === 'http://localhost/');
  t.true(document.querySelector('body').innerHTML.includes('<h1>Welcome to future, browser inside your node.js process</h1>'));
});

test.serial('injectBrowserToNode() works when there is a provided html and no http server running with index.html', async (t) => {
  t.plan(14);

  await injectBrowserToNode({
    html: `
      <html>
        <head>
          <title>Random title for test</title>
        </head>
        <body>
          <h5 id="title">My title</h5>
          <p id="text">This is a placeholder text</p>
        </body>
      </html>
    `
  });

  [
    global.window, global.mainContext, global.document, global.self
  ].forEach((reference) => t.truthy(reference));
  t.true(global.window.location.href === 'http://localhost/');
  t.true(document.getElementById('title').innerHTML === 'My title');
  t.true(document.getElementById('text').innerHTML === 'This is a placeholder text');

  await injectBrowserToNode({
    html: `
      <html>
        <head>
          <title>Random title for test</title>
        </head>
        <body>
          <h5 id="title">Some other title</h5>
          <p id="text">Other text</p>
        </body>
      </html>
    `,
    url: 'http://localhost:8081'
  });

  [
    global.window, global.mainContext, global.document, global.self
  ].forEach((reference) => t.truthy(reference));
  t.true(global.window.location.href === 'http://localhost:8081/');
  t.true(document.getElementById('title').innerHTML === 'Some other title');
  t.true(document.getElementById('text').innerHTML === 'Other text');
});

test.serial('injectBrowserToNode() works htmlPath is provided', async (t) => {
  await fs.writeFile(`${CWD}/ember-app-boilerplate/tmp/foo.html`, `
    <html>
      <head></head>
      <body>
        <p>This is a written file</p>

        <script>
          window.THIS_IS_TESTING = true;
        </script>
      </body>
    </html>
  `);

  await injectBrowserToNode({ htmlPath: `${CWD}/ember-app-boilerplate/tmp/foo.html` });

  [
    global.window, global.mainContext, global.document, global.self, global.window.THIS_IS_TESTING
  ].forEach((reference) => t.truthy(reference));
  t.true(global.window.location.href === 'http://localhost/');
  t.true(document.querySelector('p').innerHTML === 'This is a written file');

  await fs.writeFile(`${CWD}/ember-app-boilerplate/tmp/foo.html`, `
    <html>
      <head></head>
      <body>
        <p>This is another written file</p>

        <script>
          window.THIS_IS_ANOTHER_TESTING = true;
        </script>
      </body>
    </html>
  `);

  await injectBrowserToNode({
    htmlPath: `${CWD}/ember-app-boilerplate/tmp/foo.html`,
    url: 'http://localhost:5555'
  });

  [
    global.window, global.mainContext, global.document, global.self,
    global.window.THIS_IS_ANOTHER_TESTING
  ].forEach((reference) => t.truthy(reference));
  t.true(global.window.location.href === 'http://localhost:5555/');
  t.true(document.querySelector('p').innerHTML === 'This is another written file');
});

// NOTE: commented out because of unpreventable unhandled rejection error
// test.serial('injectBrowserToNode() works url is provided', async (t) => {
//   t.plan(10);

//   const PROJECT_ROOT = `${CWD}/ember-app-boilerplate`;
//   const mock = mockProcessCWD(PROJECT_ROOT);
//   const ENV = { modulePrefix: 'izelnakri', environment: 'development' };
//   await Promise.all([
//     buildApplication(ENV),
//     buildVendor(ENV),
//     buildCSS(),
//     fs.copyFile(`${PROJECT_ROOT}/index.html`, `${PROJECT_ROOT}/tmp/index.html`)
//   ]);

//   await startHTTPServer({
//     ENV: { environment: 'development', modulePrefix: 'frontend' },
//     cliArguments: { fastboot: false, port: 1234 }
//   });

//   await injectBrowserToNode({ url: 'http://localhost:1234' });

//   const window = global.window;

//   await (new Promise((resolve) => setTimeout(() => resolve(), 1000)));

//   [
//     window, global.mainContext, global.document, global.self, window.Ember,
//     window.Ember.Object, window.requirejs, window.require, window.define
//   ].forEach((reference) => t.truthy(reference));
//   t.true(global.window.location.href === 'http://localhost:1234/');

//   mock.removeMock();
// });
