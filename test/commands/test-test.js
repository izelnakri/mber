import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import test from 'ava';
import Puppeteer from 'puppeteer';
import countTime from '../../lib/utils/count-time';
import createDummyApp from '../helpers/create-dummy-app';
import mockProcessCWD from '../helpers/mock-process-cwd';

const CWD = process.cwd();
const shell = promisify(exec);
const PROJECT_ROOT = `${CWD}/dummyapp`;
const HTTP_PORT = 4200;
const BASE_CI_TEST_TIME_TRESHOLD = 15000;

let childProcessTree = [];

test.beforeEach(async () => {
  await fs.remove('dummyapp');

  try {
    await shell(`kill -9 $(lsof -i TCP:${HTTP_PORT} | grep LISTEN | awk '{print $2}'`);
  } catch(error) {
  }
});

test.afterEach.always(async () => {
  await fs.remove('dummyapp');

  childProcessTree.forEach((childProcess) => childProcess.kill('SIGKILL'));
  childProcessTree.length = 0; // NOTE: JS trick: reset without replacing an array in memory
});

// TODO: memserver test cases, --debug mode works, backend-tests

test.serial('$ mber test -> runs successfully on ci mode', async (t) => {
  t.plan(7);

  await createDummyApp();

  const counter = countTime();
  const { stdout } = await shell(`node ${CWD}/cli.js test`, { cwd: PROJECT_ROOT });
  const timeTakenForTests = counter.stop();

  console.log(stdout);

  t.true(stdout.includes('ember Server is running on http://localhost:4200 (Environment: test)'));
  t.true(stdout.includes('Integration | Component | welcome-page:'));
  t.true(stdout.includes('✔ should render correctly'));
  t.true(stdout.includes('Unit | Route | index:'));
  t.true(stdout.includes('✔ it exists'));
  t.true(stdout.includes('ember ALL TESTS PASS!'));
  t.true(timeTakenForTests < BASE_CI_TEST_TIME_TRESHOLD)
});

test.serial('$ mber test -> fails successfully on ci mode', async (t) => {
  t.plan(6);

  await createDummyApp();
  await fs.writeFile(`${PROJECT_ROOT}/src/ui/routes/index/acceptance-test.js`, `
    import { module, test } from 'qunit';
    import { visit, currentURL } from '@ember/test-helpers';
    import { setupApplicationTest } from 'ember-qunit';

    module('Acceptance | /', function(hooks) {
      setupApplicationTest(hooks);

      test('visitor can go to / and see the right content', async function(assert) {
        await visit('/');

        assert.notEqual(currentURL(), '/');
        assert.equal(document.querySelector('#title').innerHTML.includes('Congratulations, you made it!'), true);
      });
    });
  `);

  const counter = countTime();
  const { exitCode, stdout } = await spawnProcess(`node ${CWD}/cli.js test`, { cwd: PROJECT_ROOT });
  const timeTakenForTests = counter.stop();

  console.log('stdout', stdout);

  t.true(exitCode === 1);
  t.true(stdout.includes('ember THERE IS A FAILED TEST!'));
  t.true(stdout.includes('ember Server is running on http://localhost:4200 (Environment: test)'));
  t.true(stdout.includes('Acceptance | /'));
  t.true(stdout.includes('✘ visitor can go to / and see the right content'));
  t.true(timeTakenForTests < BASE_CI_TEST_TIME_TRESHOLD + 5000)
});

test.serial('$ mber test --server -> builds test files successfully', async (t) => {
  t.plan(5);

  await createDummyApp();

  const { stdout } = await spawnProcess(`node ${CWD}/cli.js test --server`, { cwd: PROJECT_ROOT });
  const { browser, QUNIT_RESULT } = await runTestsInBrowser(`http://localhost:${HTTP_PORT}`);

  console.log('QUNIT_RESULT is', QUNIT_RESULT);

  t.true(stdout.includes('ember Server is running on http://localhost:4200 (Environment: test)'));
  t.true(QUNIT_RESULT.passed === 4);
  t.true(QUNIT_RESULT.failed === 0);
  t.true(QUNIT_RESULT.total === 4);
  t.true(QUNIT_RESULT.runtime < 1000);

  await browser.close();
});

test.serial('$ mber test --server -> can run successfully and then fail on watch', async (t) => {
  t.plan(13);

  await createDummyApp();

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js test --server`, { cwd: PROJECT_ROOT });

  childProcess.stdout.on('data', (data) => console.log(data));

  const { browser, QUNIT_RESULT } = await runTestsInBrowser(`http://localhost:${HTTP_PORT}`);

  t.true(stdout.includes('ember Server is running on http://localhost:4200 (Environment: test)'));
  t.true(QUNIT_RESULT.passed === 4);
  t.true(QUNIT_RESULT.failed === 0);
  t.true(QUNIT_RESULT.total === 4);
  t.true(QUNIT_RESULT.runtime < 1000);

  await browser.close();

  await fs.writeFile(`${PROJECT_ROOT}/src/ui/routes/index/acceptance-test.js`, `
    import { module, test } from 'qunit';
    import { visit, currentURL } from '@ember/test-helpers';
    import { setupApplicationTest } from 'ember-qunit';

    module('Acceptance | /', function(hooks) {
      setupApplicationTest(hooks);

      test('visitor can go to / and see the right content', async function(assert) {
        await visit('/');

        assert.notEqual(currentURL(), '/');
        assert.equal(document.querySelector('#title').innerHTML.includes('Congratulations, you made it!'), true);
      });
    });
  `);
  await waitForRecompile(1000);

  const secondVisit = await runTestsInBrowser(`http://localhost:${HTTP_PORT}`);

  t.true(secondVisit.QUNIT_RESULT.passed === 5);
  t.true(secondVisit.QUNIT_RESULT.failed === 1);
  t.true(secondVisit.QUNIT_RESULT.total === 6);
  t.true(secondVisit.QUNIT_RESULT.runtime < 1000);

  await fs.writeFile(`${PROJECT_ROOT}/src/ui/routes/index/acceptance-test.js`, `
    import { module, test } from 'qunit';
    import { visit, currentURL } from '@ember/test-helpers';
    import { setupApplicationTest } from 'ember-qunit';

    module('Acceptance | /', function(hooks) {
      setupApplicationTest(hooks);

      test('visitor can go to / and see the right content', async function(assert) {
        await visit('/');

        assert.equal(currentURL(), '/');
        assert.equal(document.querySelector('#title').innerHTML.includes('Congratulations, you made it!'), true);
      });
    });
  `);
  await waitForRecompile(1000);

  const thirdVisit = await runTestsInBrowser(`http://localhost:${HTTP_PORT}`);

  t.true(thirdVisit.QUNIT_RESULT.passed === 6);
  t.true(thirdVisit.QUNIT_RESULT.failed === 0);
  t.true(thirdVisit.QUNIT_RESULT.total === 6);
  t.true(thirdVisit.QUNIT_RESULT.runtime < 1000);

  await secondVisit.browser.close();
  await thirdVisit.browser.close();

  childProcess.kill('SIGKILL');
  mock.removeMock();
});

test.serial('$ mber test --server -> can run fail successfully and then watches successfully', async (t) => {
  t.plan(9);

  await createDummyApp();
  await fs.writeFile(`${PROJECT_ROOT}/src/ui/routes/index/acceptance-test.js`, `
    import { module, test } from 'qunit';
    import { visit, currentURL } from '@ember/test-helpers';
    import { setupApplicationTest } from 'ember-qunit';

    module('Acceptance | /', function(hooks) {
      setupApplicationTest(hooks);

      test('visitor can go to / and see the right content', async function(assert) {
        await visit('/');

        assert.notEqual(currentURL(), '/');
        assert.equal(document.querySelector('#title').innerHTML.includes('Congratulations, you made it!'), true);
      });
    });
  `);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js test --server`, { cwd: PROJECT_ROOT });

  childProcess.stdout.on('data', (data) => console.log(data));

  const { browser, QUNIT_RESULT } = await runTestsInBrowser(`http://localhost:${HTTP_PORT}`);

  t.true(stdout.includes('ember Server is running on http://localhost:4200 (Environment: test)'));
  t.true(QUNIT_RESULT.passed === 5);
  t.true(QUNIT_RESULT.failed === 1);
  t.true(QUNIT_RESULT.total === 6);
  t.true(QUNIT_RESULT.runtime < 1000);

  await browser.close();

  await fs.writeFile(`${PROJECT_ROOT}/src/ui/routes/index/acceptance-test.js`, `
    import { module, test } from 'qunit';
    import { visit, currentURL } from '@ember/test-helpers';
    import { setupApplicationTest } from 'ember-qunit';

    module('Acceptance | /', function(hooks) {
      setupApplicationTest(hooks);

      test('visitor can go to / and see the right content', async function(assert) {
        await visit('/');

        assert.equal(currentURL(), '/');
        assert.equal(document.querySelector('#title').innerHTML.includes('Congratulations, you made it!'), true);
      });
    });
  `);

  const secondVisit = await runTestsInBrowser(`http://localhost:${HTTP_PORT}`);

  t.true(secondVisit.QUNIT_RESULT.passed === 6);
  t.true(secondVisit.QUNIT_RESULT.failed === 0);
  t.true(secondVisit.QUNIT_RESULT.total === 6);
  t.true(secondVisit.QUNIT_RESULT.runtime < 1000);

  await secondVisit.browser.close();

  childProcess.kill('SIGKILL');
  mock.removeMock();
});

async function spawnProcess(command, options) {
  return new Promise((resolve) => {
    let stdout = [];
    let childProcess = exec(command, options);

    childProcessTree.push(childProcess);
    childProcess.stdout.on('data', (data) => {
      stdout.push(data);

      if (data.includes('Visit http://localhost:4200 to run your tests')) {
        setTimeout(() => {
          const result = stdout.join('');
          console.log('stdout is');
          console.log(result);
          resolve({ stdout: result, childProcess });
        }, 1000);
      }
    });

    childProcess.on('close', (code) => {
      resolve({ exitCode: code, childProcess: childProcess, stdout: stdout.join('') });
    });
  });
}

async function waitForRecompile(waitTime) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), waitTime);
  });
}

async function runTestsInBrowser(url) {
  const browser = await Puppeteer.launch({
    headless: true,
    args: ['--disable-gpu', '--remote-debugging-port=0', '--window-size=1440,900']
  });
  const page = await browser.newPage();

  page.on('console', async (msg) => {
    const args = await Promise.all(msg.args().map((arg) => turnToObjects(arg)));

    console.log(...args);
  });

  await page.goto(url, { timeout: 0 });
  await page.evaluate(() => {
    QUnit.done((details) => {
      window.QUNIT_RESULT = details;
    });
  });

  await page.waitForFunction('window.QUNIT_RESULT', { timeout: 0 });

  const QUNIT_RESULT = await page.evaluate(() => window.QUNIT_RESULT);

  return { browser, page, QUNIT_RESULT };
}

function turnToObjects(jsHandle) {
  return jsHandle.jsonValue();
}
