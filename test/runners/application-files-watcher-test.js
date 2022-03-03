import fs from 'fs/promises';
import test from 'ava';
import WebSocket from 'ws';
import applicationFilesWatcher from '../../lib/runners/application-files-watcher.js';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app.js';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module.js';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import listenCurrentStdout from '../helpers/listen-current-stdout.js';
import WorkerPool from '../../lib/worker-pool/index.js';
import {
  APPLICATION_CSS_BUILD_TIME_THRESHOLD,
  APPLICATION_JS_BUILD_TIME_THRESHOLD,
  MEMSERVER_JS_BUILD_TIME_THRESHOLD,
  TESTS_JS_BUILD_TIME_THRESHOLD
} from '../helpers/asset-build-thresholds.js';

const DEFAULT_SOCKET_PORT = 65511;
const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/dummyapp`;
const defaultComponentContent = (className) => `
  import Component from '@glimmer/component';

  export default class ${className} extends Component {
    constructor() {
      super(...arguments);
    }
  }`;
const defaultEditedComponentContent = (className) => `
import Component from '@glimmer/component';

export default class ${className} extends Component {
  constructor() {
    super(...arguments);
    console.log('there is edited code');
  }
}`;
const DEFAULT_TEMPLATE_HBS = `<h1>Find this edit on application.js</h1>`;
const defaultEditedMemserverModelContent = (modelName) => `
import Model from 'memserver/model';

export default class ${modelName} extends Model {
  static modelEditPlaceholder = true;
}`;
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
    await render(hbs\`<WelcomePage/>\`);

    assert.ok(this.element.querySelector('#ember-welcome-page-id-selector'));
 });
});`;

test.beforeEach(async () => {
  global.MBER_THREAD_POOL = WorkerPool.start();
});

test.afterEach.always(async () => {
  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});

test.serial('it watches correctly on development mode', async (t) => {
  await fs.rm('dummyapp', { recursive: true, force: true });

  t.plan(73);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);
  const TARGET_SOCKET_PORT = 8080;

  await createAdvancedDummyApp();
  await fs.mkdir(`${PROJECT_ROOT}/tmp/assets`, { recursive: true });

  const { stdout, stopStdoutListening } = listenCurrentStdout();

  await new Promise((resolve) => setTimeout(() => resolve(), 1000));

  const WebSocketServer = await applicationFilesWatcher({
    applicationName: 'dummyapp',
    ENV: { environment: 'development', modulePrefix: 'dummyapp' },
    buildCache: {},
    cliArguments: { fastboot: true, socketPort: TARGET_SOCKET_PORT }
  });

  await new Promise((resolve) => setTimeout(() => resolve(), 2000));

  const firstSocket = new WebSocket(`ws://127.0.0.1:${TARGET_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://127.0.0.1:${TARGET_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await applicationFileWatcherTests(t, stdout, 'development');

  WebSocketServer.killWatchers();
  WebSocketServer.close();
  stopStdoutListening();
  mock.removeMock();
  await fs.rm('dummyapp', { recursive: true, force: true });
});

test.serial('it watches memserver files correctly', async (t) => {
  await fs.rm('dummyapp', { recursive: true, force: true });

  t.plan(29);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp('dummyapp', { memserver: true });
  await fs.mkdir(`${PROJECT_ROOT}/tmp/assets`, { recursive: true });

  const { stdout, stopStdoutListening } = listenCurrentStdout();

  await new Promise((resolve) => setTimeout(() => resolve(), 1000));

  const WebSocketServer = await applicationFilesWatcher({
    applicationName: 'dummyapp',
    ENV: {
      environment: 'memserver',
      modulePrefix: 'dummyapp',
      memserver: {
        enabled: true
      }
    },
    buildCache: {},
    cliArguments: { fastboot: true, socketPort: 65511 }
  });

  await new Promise((resolve) => setTimeout(() => resolve(), 2000));

  t.true(getAddNotificationCount(stdout, '/memserver/models/email.ts') === 0);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 0);

  await fs.mkdir(`${PROJECT_ROOT}/memserver/models`, { recursive: true });
  await writeMemServerCode('/models/email.ts', defaultEditedMemserverModelContent('Email'));

  t.true(getAddNotificationCount(stdout, '/memserver/models/email.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 1);

  const firstContent = await readMemServerJS();

  t.true(codeIncludesAMDModule(firstContent, 'dummyapp/memserver/models/email'));
  t.true(occurrenceCount(firstContent, /modelEditPlaceholder = true/g) === 1);

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/user.ts') === 0);

  await writeMemServerCode('/models/user.ts', defaultEditedMemserverModelContent('User'));

  t.true(getChangeNotificationCount(stdout, '/memserver/models/user.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 2);

  await removeFile(`${PROJECT_ROOT}/memserver/models/email.ts`);

  t.true(getRemovalNotificationCount(stdout, '/memserver/models/email.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 3);
  t.true(!codeIncludesAMDModule(await readMemServerJS(), 'dummyapp/memserver/models/email'));

  await removeFile(`${PROJECT_ROOT}/memserver/models/user.ts`);

  t.true(getRemovalNotificationCount(stdout, '/memserver/models/user.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 4);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'memserver') === 4);
  t.true(!codeIncludesAMDModule(await readMemServerJS(), 'dummyapp/memserver/models/user'));

  WebSocketServer.killWatchers();
  WebSocketServer.close();
  stopStdoutListening();
  mock.removeMock();
  await fs.rm('dummyapp', { recursive: true, force: true });
});

// TODO: calledOnce test with sinon
test.serial('it watches test files correctly', async (t) => {
  await fs.rm('dummyapp', { recursive: true, force: true });

  t.plan(97);

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp('dummyapp', { memserver: true });
  await fs.mkdir(`${PROJECT_ROOT}/tmp/assets`, { recursive: true });

  const { stdout, stopStdoutListening } = listenCurrentStdout();

  await new Promise((resolve) => setTimeout(() => resolve(), 1000));

  const WebSocketServer = await applicationFilesWatcher({
    applicationName: 'dummyapp',
    ENV: {
      environment: 'test',
      modulePrefix: 'dummyapp',
      memserver: {
        enabled: true
      }
    },
    buildCache: {},
    cliArguments: { fastboot: false, socketPort: DEFAULT_SOCKET_PORT, testing: true }
  });

  await new Promise((resolve) => setTimeout(() => resolve(), 3000));

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await applicationFileWatcherTests(t, stdout, 'test');

  await writeMemServerCode('/models/email.ts', defaultEditedMemserverModelContent('Email'));

  t.true(getAddNotificationCount(stdout, '/memserver/models/email.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'test') === 1);

  const firstContent = await readMemServerJS();

  t.true(codeIncludesAMDModule(firstContent, 'dummyapp/memserver/models/email'));
  t.true(occurrenceCount(firstContent, /modelEditPlaceholder = true/g) === 1);

  await removeFile(`${PROJECT_ROOT}/memserver/models/email.ts`);

  t.true(getRemovalNotificationCount(stdout, '/memserver/models/email.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', 'test') === 2);
  t.true(!codeIncludesAMDModule(await readMemServerJS(), 'dummyapp/memserver/models/email'));

  await fs.mkdir(`${PROJECT_ROOT}/tests/acceptance`, { recursive: true });
  await writeAcceptanceTestOnTestFolder('/homepage-test.ts', DEFAULT_ACCEPTANCE_TEST_TO_ADD);

  t.true(getAddNotificationCount(stdout, '/tests/acceptance/homepage-test.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', 'test') === 1);
  t.true(codeIncludesAMDModule(await readTestsJS(), 'dummyapp/tests/acceptance/homepage-test'));

  await writeIntegrationTestOnComponent(
    '/welcome-page/integration-test.ts',
    DEFAULT_INTEGRATION_TEST_TO_ADD
  );

  t.true(
    getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.ts') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', 'test') === 2);

  const testsFirstContent = await readTestsJS();

  t.true(codeIncludesAMDModule(testsFirstContent, 'dummyapp/tests/acceptance/homepage-test'));

  t.true(occurrenceCount(testsFirstContent, /this is added by this test/g) === 2);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/welcome-page/integration-test.ts`);

  t.true(
    getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.ts') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', 'test') === 3);

  const testsLastContent = await readTestsJS();

  t.true(codeIncludesAMDModule(testsLastContent, 'dummyapp/tests/acceptance/homepage-test'));
  t.true(occurrenceCount(testsLastContent, /this is added by this test/g) === 1);

  WebSocketServer.killWatchers();
  WebSocketServer.close();
  stopStdoutListening();
  mock.removeMock();
  await fs.rm('dummyapp', { recursive: true, force: true });
});

// it can change the ENV by changing the environment.js
// TODO: also test start-http-server, then transpilers

function occurrenceCount(sourceString, targetString) {
  return (sourceString.match(targetString) || []).length;
}

function writeCSSCode(path, content) {
  return new Promise(async (resolve) => {
    await fs.mkdir(`${PROJECT_ROOT}${path}`.split('/').slice(0, -1).join('/'), { recursive: true });
    await fs.writeFile(`${PROJECT_ROOT}${path}`, content);

    setTimeout(() => resolve(), APPLICATION_CSS_BUILD_TIME_THRESHOLD + 700);
  });
}

function writeComponentCode(
  path = '/dummy-component/component.ts',
  content = ''
) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function removeFile(codePath) {
  return new Promise(async (resolve) => {
    try {
      await fs.rm(codePath);
    } finally {
      setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD + 250);
    }
  });
}

function writeMemServerCode(path, content = '') {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/memserver${path}`, content);

    setTimeout(() => resolve(), MEMSERVER_JS_BUILD_TIME_THRESHOLD + 700);
  });
}

function writeAcceptanceTestOnTestFolder(path, content = DEFAULT_ACCEPTANCE_TEST_TO_ADD) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/tests/acceptance${path}`, content);

    setTimeout(() => resolve(), TESTS_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function writeIntegrationTestOnComponent(
  path = '/welcome-page/integration-test.ts',
  content = DEFAULT_INTEGRATION_TEST_TO_ADD
) {
  return new Promise(async (resolve) => {
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

  t.true(getAddNotificationCount(stdout, '/src/ui/styles/vendor/dummy.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 1);

  await fs.mkdir(`${PROJECT_ROOT}/src/ui/components/some-component`, { recursive: true });
  await writeCSSCode(
    '/src/ui/components/some-component/styles.scss',
    '.awesomeness { color: blue }'
  );

  t.true(getAddNotificationCount(stdout, '/src/ui/components/some-component/styles.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 2);

  const cssContent = await readApplicationCSS();

  t.true(occurrenceCount(cssContent, /\.awesomeness {/g) === 1);

  await fs.mkdir(`${PROJECT_ROOT}/src/ui/components/dummy-component`, { recursive: true });
  await writeComponentCode('/dummy-component/component.ts', defaultComponentContent('DummyComponent'));

  t.true(getAddNotificationCount(stdout, '/src/ui/components/dummy-component/component.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 1);

  const firstContent = await readApplicationJS();

  t.true(
    codeIncludesAMDModule(firstContent, 'dummyapp/src/ui/components/dummy-component/component')
  );
  t.true(!firstContent.includes(`console.log('there is edited code');`));

  await writeComponentCode('/dummy-component/component.ts', defaultEditedComponentContent('DummyComponent'));

  t.true(
    getChangeNotificationCount(stdout, '/src/ui/components/dummy-component/component.ts') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 2);

  const secondContent = await readApplicationJS();

  t.true(
    codeIncludesAMDModule(secondContent, 'dummyapp/src/ui/components/dummy-component/component')
  );
  t.true(occurrenceCount(secondContent, /there is edited code/g) === 1);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 0);

  await writeComponentCode('/welcome-page/component.ts', defaultEditedComponentContent('WelcomePage'));

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 3);

  const thirdContent = await readApplicationJS();

  t.true(
    codeIncludesAMDModule(thirdContent, 'dummyapp/src/ui/components/dummy-component/component')
  );
  t.true(codeIncludesAMDModule(thirdContent, 'dummyapp/src/ui/components/welcome-page/component'));
  t.true(occurrenceCount(thirdContent, /there is edited code/g) === 2);

  t.true(
    getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/component.ts') === 0
  );

  await removeFile(`${PROJECT_ROOT}/src/ui/components/dummy-component/component.ts`);

  t.true(
    getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/component.ts') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 4);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 4);

  const fourthContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(fourthContent, 'dummyapp/src/ui/components/welcome-page/component'));
  t.true(
    !codeIncludesAMDModule(fourthContent, 'dummyapp/src/ui/components/dummy-component/component')
  );
  t.true(occurrenceCount(fourthContent, /there is edited code/g) === 1);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 0);

  await removeFile(`${PROJECT_ROOT}/src/ui/components/welcome-page/component.ts`);

  t.true(getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 5);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 5);

  const fifthContent = await readApplicationJS();

  t.true(!codeIncludesAMDModule(fifthContent, 'dummyapp/src/ui/components/welcome-page/component'));
  t.true(
    !codeIncludesAMDModule(fifthContent, 'dummyapp/src/ui/components/dummy-component/component')
  );
  t.true(occurrenceCount(fifthContent, /there is edited code/g) === 0);

  await writeComponentCode('/dummy-component/template.hbs', DEFAULT_TEMPLATE_HBS);

  t.true(getAddNotificationCount(stdout, '/src/ui/components/dummy-component/template.hbs') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 6);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 6);
  t.true(
    codeIncludesAMDModule(
      await readApplicationJS(),
      'dummyapp/src/ui/components/dummy-component/template'
    )
  );

  await removeFile(`${PROJECT_ROOT}/src/ui/components/dummy-component/template.hbs`);

  t.true(
    getRemovalNotificationCount(stdout, '/src/ui/components/dummy-component/template.hbs') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 7);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 7);
  t.true(
    !codeIncludesAMDModule(
      await readApplicationJS(),
      'dummyapp/src/ui/components/dummy-component/template'
    )
  );
}
