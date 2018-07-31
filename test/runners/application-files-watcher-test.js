import fs from 'fs-extra';
import intercept from 'intercept-stdout';
import test from 'ava';
import WebSocket from 'ws';
import stripANSI from 'strip-ansi';
import applicationFilesWatcher from '../../lib/runners/application-files-watcher';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import mockProcessCWD from '../helpers/mock-process-cwd';
import { APPLICATION_JS_BUILD_TIME_THRESHOLD } from '../helpers/asset-build-thresholds.js';

test.beforeEach(async () => {
  await fs.remove('dummyapp');
});

test.afterEach.always(async () => {
  await fs.remove('dummyapp');
});

const DEFAULT_SOCKET_PORT = 65511;
const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/dummyapp`;
const DEFAULT_COMPONENT_JS = `
  import Ember from 'ember';
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default Component.extend({
    init() {
      this._super(...args);
    }
  });`;
const DEFAULT_EDITED_COMPONENT_JS = `
import Ember from 'ember';
import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  init() {
    this._super(...args);
    console.log('there is edited code');
  }
});`;
const DEFAULT_TEMPLATE_HBS = `<h1>Find this edit on application.js</h1>`;
const DEFAULT_MEMSERVER_CODE_TO_ADD = ``;
const DEFAULT_ACCEPTANCE_TEST_TO_ADD = ``;
const DEFAULT_UNIT_TEST_TO_ADD = ``;

test('it watches correctly on development mode', async (t) => {
  t.plan(46);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp();
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  let stdout = [];
  let stopStdoutInterception = intercept(function(text) {
    stdout.push(stripANSI(text));
  });
  // TODO: change file here so watcher runs even if there were no webSockerServer connection
  const WebSocketServer = applicationFilesWatcher('development', {
    buildConfig: { ENV: { environment: 'development', modulePrefix: 'watchapp' }, buildCache: {} },
    buildDist: false,
    entryPoint: null,
    fastboot: true,
    socketPort: 65511
  });

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await writeComponentCode('/dummy-component/component.js');

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.js', 'development') === 1);

  const firstContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(firstContent, 'watchapp/src/ui/components/dummy-component/component'));
  t.true(!firstContent.includes(`console.log('there is edited code');`));

  await writeComponentCode('/dummy-component/component.js', DEFAULT_EDITED_COMPONENT_JS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 2);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.js', 'development') === 2);

  const secondContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(secondContent, 'watchapp/src/ui/components/dummy-component/component'));
  t.true(occurrenceCount(secondContent, /there is edited code/g) === 1);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 0);

  await writeComponentCode('/welcome-page/component.js', DEFAULT_EDITED_COMPONENT_JS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'application.js', 'development') === 3);

  const thirdContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(thirdContent, 'watchapp/src/ui/components/dummy-component/component'));
  t.true(codeIncludesAMDModule(thirdContent, 'watchapp/src/ui/components/welcome-page/component'));
  t.true(occurrenceCount(thirdContent, /there is edited code/g) === 2);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 0);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/dummy-component/component.js`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 4);
  t.true(getBuiltNotificationCount(stdout, 'application.js', 'development') === 4);

  const fourthContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(fourthContent, 'watchapp/src/ui/components/welcome-page/component'));
  t.true(!codeIncludesAMDModule(fourthContent, 'watchapp/src/ui/components/dummy-component/component'));
  t.true(occurrenceCount(fourthContent, /there is edited code/g) === 1);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 0);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/welcome-page/component.js`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 5);
  t.true(getBuiltNotificationCount(stdout, 'application.js', 'development') === 5);

  const fifthContent = await readApplicationJS();

  t.true(!codeIncludesAMDModule(fifthContent, 'watchapp/src/ui/components/welcome-page/component'));
  t.true(!codeIncludesAMDModule(fifthContent, 'watchapp/src/ui/components/dummy-component/component'));
  t.true(occurrenceCount(fifthContent, /there is edited code/g) === 0);

  WebSocketServer.cleanWatchers();
  WebSocketServer.close();
  stopStdoutInterception();
  mock.removeMock();
});

// test('it watches memserver files correctly', async (t) => {
//
// });

// test('it watches test files correctly', async (t) => {
//
// });

// test('it can run on different sockerPort and endpoint', async (t) => {
//
// });

// test('it handles css, js, hbs syntax errors gracefully on fastboot', async (t) => {
//
// });

// test('it handles css, js, hbs syntax errors gracefully without fastboot', async (t) => {
//
// });


// it can change the ENV by changing the environment.js
// TODO: also test start-http-server, then transpilers

function occurrenceCount(sourceString, targetString) {
  return (sourceString.match(targetString) || []).length;
}

function writeComponentCode(path='/dummy-component/component.js', content=DEFAULT_COMPONENT_JS) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}/src/ui/components${path}`);
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD);
  });
}

function removeFile(codePath) {
  return new Promise(async (resolve) => {
    await fs.remove(codePath);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD);
  });
}

function writeMemServerCode() {

}

function writeAcceptanceTestOnTestFolder() {

}

function writeUnitTestOnComponent() {

}

function assertThatSocketReceivesMessage(socket, t) {
  socket.on('message', () => t.true(true));
}

function getChangeNotificationCount(stdout, path) {
  return stdout.filter((text) => text.includes(`CHANGED: ${path}`)).length;
}

function getRemovalNotificationCount(stdout, path) {
  return stdout.filter((text) => text.includes(`REMOVED: ${path}`)).length;
}

function getBuildingNotificationCount(stdout, targetFileName) {
  return stdout.filter((text) => text.includes(`BUILDING: ${targetFileName}...`)).length;
}

function getBuiltNotificationCount(stdout, fileName, environment) {
  return stdout.filter((text) => {
    return text.includes(`BUILT: ${fileName} in`) && text.includes(`Environment: ${environment}`);
  }).length;
}

async function readApplicationJS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`)).toString();
}

async function readTestsJS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/tests.js`)).toString();
}

async function readMemServerJS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/memserver.js`)).toString();
}

// async function testApplicationWatcherExists() {
//
// }
