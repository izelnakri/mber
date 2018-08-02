// TODO: make watchers before socket visit
import fs from 'fs-extra';
import intercept from 'intercept-stdout';
import test from 'ava';
import WebSocket from 'ws';
import stripANSI from 'strip-ansi';
import applicationFilesWatcher from '../../lib/runners/application-files-watcher';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import mockProcessCWD from '../helpers/mock-process-cwd';
import {
  APPLICATION_CSS_BUILD_TIME_THRESHOLD,
  APPLICATION_JS_BUILD_TIME_THRESHOLD,
  MEMSERVER_JS_BUILD_TIME_THRESHOLD,
  TESTS_JS_BUILD_TIME_THRESHOLD
} from '../helpers/asset-build-thresholds.js';

test.beforeEach(async () => {
  await (new Promise((resolve) => setTimeout(() => resolve(), 2000)));
  await fs.remove('dummyapp');
});

test.afterEach.always(async () => {
  await (new Promise((resolve) => setTimeout(() => resolve(), 2000)));
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
const DEFAULT_EDITED_MEMSERVER_MODEL_JS = `
import Model from 'memserver/model';

export default Model({
  modelEditPlaceholder: true
});
`;
const DEFAULT_ACCEPTANCE_TEST_TO_ADD = `
import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummyapp/tests/helpers';

module('Acceptance | route', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /route', async function(assert) {
    await visit('/route');
    console.log('this is added by this test');
    assert.equal(currentURL(), '/route');
  });
});`;
const DEFAULT_INTEGRATION_TEST_TO_ADD = `
import { module, test } from 'qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { setupRenderingTest } from '../../../../tests/helpers';

module('Integration | Component | welcome-page', function(hooks) {
  setupRenderingTest(hooks);

  test('should render correctly', async function(assert) {
    assert.expect(1);
    console.log('this is added by this test');
    await render(hbs\`{{welcome-page}}\`);

    assert.ok(this.element.querySelector('#ember-welcome-page-id-selector'));
 });
});
`;

test.serial('it watches correctly on development mode', async (t) => {
  t.plan(73);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);
  const TARGET_SOCKET_PORT = 8080;
  await createAdvancedDummyApp();
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  let stdout = [];
  let stopStdoutInterception = intercept(function(text) {
    stdout.push(stripANSI(text));
  });
  // TODO: change file here so watcher runs even if there were no webSockerServer connection
  const WebSocketServer = applicationFilesWatcher('development', {
    buildConfig: {
      ENV: { environment: 'development', modulePrefix: 'dummyapp' },
      buildCache: {}
    },
    buildDist: false,
    entryPoint: null,
    fastboot: true,
    socketPort: TARGET_SOCKET_PORT
  });

  const firstSocket = new WebSocket(`ws://127.0.0.1:${TARGET_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://127.0.0.1:${TARGET_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await applicationFileWatcherTests(t, stdout, 'development');

  WebSocketServer.cleanWatchers();
  WebSocketServer.close();
  stopStdoutInterception();
  mock.removeMock();
});

test.serial('it watches memserver files correctly', async (t) => {
  t.plan(31);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp('dummyapp', { memserver: true });
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  let stdout = [];
  let stopStdoutInterception = intercept(function(text) {
    stdout.push(stripANSI(text));
  });
  // TODO: change file here so watcher runs even if there were no webSockerServer connection
  const WebSocketServer = applicationFilesWatcher('memserver', {
    buildConfig: {
      ENV: {
        environment: 'memserver',
        modulePrefix: 'dummyapp',
        memserver: {
          enabled: true
        }
      },
      buildCache: {}
    },
    buildDist: false,
    entryPoint: null,
    fastboot: true,
    socketPort: 65511
  });

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/email.js') === 0);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 0);

  await writeMemServerCode('/models/email.js', DEFAULT_EDITED_MEMSERVER_MODEL_JS);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/email.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 1);

  const firstContent = await readMemServerJS();

  t.true(codeIncludesAMDModule(firstContent, 'dummyapp/memserver/models/email'));
  t.true(occurrenceCount(firstContent, /modelEditPlaceholder: true/g) === 1);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/user.js') === 0);

  await writeMemServerCode('/models/user.js', DEFAULT_EDITED_MEMSERVER_MODEL_JS);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/user.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 2);

  await removeFile(`${PROJECT_ROOT}/memserver/models/email.js`);

  t.true(getRemovalNotificationCount(stdout, '/memserver/models/email.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 3);
  t.true(!codeIncludesAMDModule(await readMemServerJS(), 'dummyapp/memserver/models/email'));


  await removeFile(`${PROJECT_ROOT}/memserver/models/user.js`);

  t.true(getRemovalNotificationCount(stdout, '/memserver/models/user.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 4);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 4);
  t.true(!codeIncludesAMDModule(await readMemServerJS(), 'dummyapp/memserver/models/user'));

  WebSocketServer.cleanWatchers();
  WebSocketServer.close();
  stopStdoutInterception();
  mock.removeMock();
});

test.serial('it watches test files correctly', async (t) => {
  t.plan(97);

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp('dummyapp', { memserver: true });
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  let stdout = [];
  let stopStdoutInterception = intercept(function(text) {
    stdout.push(stripANSI(text));
  });
  // TODO: change file here so watcher runs even if there were no webSockerServer connection
  const WebSocketServer = applicationFilesWatcher('test', {
    buildConfig: {
      ENV: {
        environment: 'test',
        modulePrefix: 'dummyapp',
        memserver: {
          enabled: true
        }
      },
      buildCache: {}
     },
    fastboot: false,
    testing: true
  });

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await applicationFileWatcherTests(t, stdout, 'test');

  await writeMemServerCode('/models/email.js', DEFAULT_EDITED_MEMSERVER_MODEL_JS);

  t.true(getAddNotificationCount(stdout, '/memserver/models/email.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'test') === 1);

  const firstContent = await readMemServerJS();

  t.true(codeIncludesAMDModule(firstContent, 'dummyapp/memserver/models/email'));
  t.true(occurrenceCount(firstContent, /modelEditPlaceholder: true/g) === 1);

  await removeFile(`${PROJECT_ROOT}/memserver/models/email.js`);

  t.true(getRemovalNotificationCount(stdout, '/memserver/models/email.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'test') === 2);
  t.true(!codeIncludesAMDModule(await readMemServerJS(), 'dummyapp/memserver/models/email'));

  await writeAcceptanceTestOnTestFolder('/homepage-test.js', DEFAULT_ACCEPTANCE_TEST_TO_ADD);

  t.true(getAddNotificationCount(stdout, '/tests/acceptance/homepage-test.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', 'test') === 1);
  t.true(codeIncludesAMDModule(await readTestsJS(), 'dummyapp/tests/acceptance/homepage-test'));

  await writeIntegrationTestOnComponent('/welcome-page/integration-test.js', DEFAULT_INTEGRATION_TEST_TO_ADD);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.j') === 1);
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', 'test') === 2);

  const testsFirstContent = await readTestsJS();

  t.true(codeIncludesAMDModule(testsFirstContent, 'dummyapp/tests/acceptance/homepage-test'));

  t.true(occurrenceCount(testsFirstContent, /this is added by this test/g) === 2);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/welcome-page/integration-test.js`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.j') === 1);
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', 'test') === 3);

  const testsLastContent = await readTestsJS();

  t.true(codeIncludesAMDModule(testsLastContent, 'dummyapp/tests/acceptance/homepage-test'));
  t.true(occurrenceCount(testsLastContent, /this is added by this test/g) === 1);

  WebSocketServer.cleanWatchers();
  WebSocketServer.close();
  stopStdoutInterception();
  mock.removeMock();
});

// it can change the ENV by changing the environment.js
// TODO: also test start-http-server, then transpilers

function occurrenceCount(sourceString, targetString) {
  return (sourceString.match(targetString) || []).length;
}

function writeCSSCode(path, content) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}${path}`);
    await fs.writeFile(`${PROJECT_ROOT}${path}`, content);

    setTimeout(() => resolve(), APPLICATION_CSS_BUILD_TIME_THRESHOLD + 250);
  });
}

function writeComponentCode(path='/dummy-component/component.js', content=DEFAULT_COMPONENT_JS) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}/src/ui/components${path}`);
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function removeFile(codePath) {
  return new Promise(async (resolve) => {
    await fs.remove(codePath);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function writeMemServerCode(path, content=DEFAULT_EDITED_MEMSERVER_MODEL_JS) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}/memserver{path}`);
    await fs.writeFile(`${PROJECT_ROOT}/memserver${path}`, content);

    setTimeout(() => resolve(), MEMSERVER_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function writeAcceptanceTestOnTestFolder(path, content=DEFAULT_ACCEPTANCE_TEST_TO_ADD) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}/tests/acceptance${path}`);
    await fs.writeFile(`${PROJECT_ROOT}/tests/acceptance${path}`, content);

    setTimeout(() => resolve(), TESTS_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function writeIntegrationTestOnComponent(path='/welcome-page/integration-test.js', content=DEFAULT_INTEGRATION_TEST_TO_ADD) {
  return new Promise(async (resolve) => {
    await fs.ensureFile(`${PROJECT_ROOT}/src/ui/components${path}`);
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), TESTS_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function assertThatSocketReceivesMessage(socket, t) {
  socket.on('message', () => t.true(true));
}

function getAddNotificationCount(stdout, path) {
  return stdout.filter((text) => text.includes(`ADDED: ${path}`)).length;
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

async function readApplicationCSS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`)).toString();
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

async function applicationFileWatcherTests(t, stdout, environment) {
  await writeCSSCode('/src/ui/styles/vendor/dummy.scss', '.lol {}');

  t.true(getChangeNotificationCount(stdout, '/src/ui/styles/vendor/dummy.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 1);

  await writeCSSCode('/src/ui/components/some-component/styles.scss', '.awesomeness { color: blue }');

  t.true(getAddNotificationCount(stdout, '/src/ui/components/some-component/styles.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 2);

  const cssContent = await readApplicationCSS();

  t.true(occurrenceCount(cssContent, /\.awesomeness {/g) === 1);

  await writeComponentCode('/dummy-component/component.js');

  t.true(getAddNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 1);

  const firstContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(firstContent, 'dummyapp/src/ui/components/dummy-component/component'));
  t.true(!firstContent.includes(`console.log('there is edited code');`));

  await writeComponentCode('/dummy-component/component.js', DEFAULT_EDITED_COMPONENT_JS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 2);

  const secondContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(secondContent, 'dummyapp/src/ui/components/dummy-component/component'));
  t.true(occurrenceCount(secondContent, /there is edited code/g) === 1);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 0);

  await writeComponentCode('/welcome-page/component.js', DEFAULT_EDITED_COMPONENT_JS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 3);

  const thirdContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(thirdContent, 'dummyapp/src/ui/components/dummy-component/component'));
  t.true(codeIncludesAMDModule(thirdContent, 'dummyapp/src/ui/components/welcome-page/component'));
  t.true(occurrenceCount(thirdContent, /there is edited code/g) === 2);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 0);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/dummy-component/component.js`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 4);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 4);

  const fourthContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(fourthContent, 'dummyapp/src/ui/components/welcome-page/component'));
  t.true(!codeIncludesAMDModule(fourthContent, 'dummyapp/src/ui/components/dummy-component/component'));
  t.true(occurrenceCount(fourthContent, /there is edited code/g) === 1);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 0);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/welcome-page/component.js`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/component.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 5);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 5);

  const fifthContent = await readApplicationJS();

  t.true(!codeIncludesAMDModule(fifthContent, 'dummyapp/src/ui/components/welcome-page/component'));
  t.true(!codeIncludesAMDModule(fifthContent, 'dummyapp/src/ui/components/dummy-component/component'));
  t.true(occurrenceCount(fifthContent, /there is edited code/g) === 0);

  await writeComponentCode('/dummy-component/template.hbs', DEFAULT_TEMPLATE_HBS);

  t.true(getAddNotificationCount(stdout, '/src/ui/components/dummy-component/template.hbs') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 6);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 6);
  t.true(codeIncludesAMDModule(await readApplicationJS(), 'dummyapp/src/ui/components/dummy-component/template'));

  await removeFile(`${PROJECT_ROOT}/src/ui/components/dummy-component/template.hbs`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/template.hbs') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 7);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 7);
  t.true(!codeIncludesAMDModule(await readApplicationJS(), 'dummyapp/src/ui/components/dummy-component/template'));
}
