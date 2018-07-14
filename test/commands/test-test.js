import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import test from 'ava';
import countTime from '../../lib/utils/count-time';
// import mockProcessCWD from '../helpers/mock-process-cwd';
import createDummyApp from '../helpers/create-dummy-app';

const CWD = process.cwd();
const shell = promisify(exec);
const PROJECT_ROOT = `${CWD}/dummyapp`;
const HTTP_PORT = 4200;

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


// TODO: also test memserver cases

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
  t.true(timeTakenForTests < 12000)
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
  t.true(timeTakenForTests < 20000)
});

// test.serial('$ mber test --server -> builds test files successfully', async (t) => {
//   t.plan(6);
//
//   await createDummyApp();
//
//   const { exitCode, stdout } = await spawnProcess(`node ${CWD}/cli.js test --server`, {
//     cwd: PROJECT_ROOT
//   });
//   // TODO: inject Node here
//   // const counter = countTime();
//   // const timeTakenForTests = counter.stop();
//
//   // console.log('stdout', stdout);
//   //
//   // t.true(exitCode === 1);
//   // t.true(stdout.includes('ember THERE IS A FAILED TEST!'));
//   // t.true(stdout.includes('ember Server is running on http://localhost:4200 (Environment: test)'));
//   // t.true(stdout.includes('Acceptance | /'));
//   // t.true(stdout.includes('✘ visitor can go to / and see the right content'));
//   // t.true(timeTakenForTests < 20000)
// });
//
// test('$ mber test --server -> can run successfully and then fail on watch', (t) => {
//   t.true(true);
// });
//
// test('$ mber test --server -> can run fail successfully and then watches successfully', (t) => {
//   t.true(true);
// });

// TODO: memserver test cases, --debug mode works, backend-tests

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
    })

    // setTimeout(() => {
    //   console.log('SPAWNED PROCESS RETURNS STDOUT FROM TIMEOUT...');
    //   const result = stdout.join('');
    //   console.log('stdout is');
    //   console.log(result);
    //   resolve({ stdout: result, childProcess });
    // }, 20000);
  });
}
