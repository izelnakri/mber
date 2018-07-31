import fs from 'fs-extra';
import intercept from 'intercept-stdout';
import test from 'ava';
import WebSocket from 'ws';
import stripANSI from 'strip-ansi';
import applicationFilesWatcher from '../../lib/runners/application-files-watcher';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
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

// TODO: import codeIncludesAMDModule
const DEFAULT_COMPONENT_JS = `
  import Ember from 'ember';
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default Component.extend({
    init() {
      this._super(...args);
      console.log('find this data in application.js');
    }
  });`;
const DEFAULT_TEMPLATE_HBS = `<h1>Find this edit on application.js</h1>`;
const DEFAULT_MEMSERVER_CODE_TO_ADD = ``;
const DEFAULT_ACCEPTANCE_TEST_TO_ADD = ``;
const DEFAULT_UNIT_TEST_TO_ADD = ``;
// NOTE: we need stdin/out check because it will also verify only one watch per event!!

test('it watches correctly on development mode', async (t) => {
  t.plan(7);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp();
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  let stdout = [];
  let unhookIntercept = intercept(function(text) {
    stdout.push(stripANSI(text));
  });
  const WebSocketServer = applicationFilesWatcher('development', {   // TODO: change file here so watcher runs even if there were no webSockerServer connection
    buildConfig: { ENV: { environment: 'development', modulePrefix: 'watchapp' }, buildCache: {} },
    buildDist: false,
    entryPoint: null,
    fastboot: true,
    socketPort: 65511
  });

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, () => {
    t.true(true);
  });
  assertThatSocketReceivesMessage(secondSocket, () => {
    t.true(true);
  });

  await writeComponentCode('/dummy-component/component.js');

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.js', 'development') === 1);

  const content = (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`)).toString(); // TODO: move this to function
  t.true(content.includes(`console.log('find this data in application.js');`));

  // TODO: edit the new module

  // TODO: edit the existing module

  // TODO: remove existing module

  // TODO: remove new module
  
  WebSocketServer.cleanWatchers();
  WebSocketServer.close();
  unhookIntercept();
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

function writeComponentCode(path='/dummy-component/component.js', content=DEFAULT_COMPONENT_JS) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}/src/ui/components${path}`);
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD);
  });
}

function writeMemServerCode() {

}

function writeAcceptanceTestOnTestFolder() {

}

function writeUnitTestOnComponent() {

}

function assertThatSocketReceivesMessage(socket, callback) {
  socket.once('message', callback);
}

function getChangeNotificationCount(stdout, path) {
  return stdout.filter((text) => text.includes(`CHANGED: ${path}`)).length;
}

function getBuildingNotificationCount(stdout, targetFileName) {
  return stdout.filter((text) => text.includes(`BUILDING: ${targetFileName}...`)).length;
}

function getBuiltNotificationCount(stdout, fileName, environment) {
  return stdout.filter((text) => {
    return text.includes(`BUILT: ${fileName} in`) && text.includes(`Environment: ${environment}`);
  }).length;
}
