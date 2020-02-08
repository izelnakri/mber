import fs from 'fs-extra';
import test from 'ava';
import WebSocket from 'ws';
import applicationFilesWatcher from '../../lib/runners/application-files-watcher';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module';
import listenCurrentStdout from '../helpers/listen-current-stdout';
import mockProcessCWD from '../helpers/mock-process-cwd';
import WorkerPool from '../../lib/worker-pool';
import {
  APPLICATION_CSS_BUILD_TIME_THRESHOLD,
  APPLICATION_JS_BUILD_TIME_THRESHOLD,
  MEMSERVER_JS_BUILD_TIME_THRESHOLD,
  TESTS_JS_BUILD_TIME_THRESHOLD
} from '../helpers/asset-build-thresholds.js';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/dummyapp`;
const DEFAULT_SOCKET_PORT = 65511;
const DEFAULT_COMPONENT_JS = `
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default Component.extend({
    init() {
      this._super(...args);
    }
  });`;
const DEFAULT_EDITED_COMPONENT_JS = `
import Component from '@ember/component';

export default Component.extend({
  init() {
    this._super(...args);
    console.log('there is edited code');
  }
});`;
const DEFAULT_TEMPLATE_HBS = `<h1>in component template.hbs for test</h1>`;
const DEFAULT_EDITED_MEMSERVER_MODEL_JS = `
import Model from 'memserver/model';

export default Model({
  modelEditPlaceholder: true
});`;
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
});`;
const CSS_ERROR = `
  .testing-class [
    color: red.
  ]
`;
const JS_TYPO_ERROR = `
  export default {
    JavaScript: 'sometimes sucks';
  }
`;
const JS_FILE_ERROR = `
ASLDASmdasmd{E{!R!@R}}
`;
const HBS_TYPO_ERROR = `
<h1>This is mee
{{another-component}}
`;
const HBS_SYNTAX_ERROR = `
<h1>This is mee</h1>
{{/another-component}}
`;

test.beforeEach(async () => {
  global.MBER_THREAD_POOL = WorkerPool.start();
});

test.afterEach.always(async () => {
  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});
// TODO: later assert error html content
test.serial('it handles css, js, hbs syntax errors gracefully on fastboot', async (t) => {
  await fs.remove('dummyapp');

  t.plan(138);

  global.fastboot = {
    reload() {
      t.true(true);
    }
  };

  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp();
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  const { stdout, stopStdoutListening } = listenCurrentStdout();
  const WebSocketServer = await applicationFilesWatcher({
    applicationName: 'dummyapp',
    ENV: {
      environment: 'memserver',
      modulePrefix: 'dummyapp',
      memserver: { enabled: true }
    },
    buildCache: {},
    cliArguments: { fastboot: true, socketPort: DEFAULT_SOCKET_PORT, testing: true }
  });

  await new Promise((resolve) => setTimeout(() => resolve(), 2000));
  await writeCSSCode('/src/ui/styles/application.scss', CSS_ERROR);

  t.true(getChangeNotificationCount(stdout, '/src/ui/styles/application.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.css', 'memserver') === 0);
  t.true(stdoutOccurenceCount(stdout, /ember CSS build error:/g) === 1);

  const firstSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${DEFAULT_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await testCSSErrorHandlingWorks(t, stdout, 'memserver');
  await testApplicationJSErrorHandlingWorks(t, stdout, 'memserver');
  await testApplicationHBSErrorHandlingWorks(t, stdout, 'memserver');
  await testMemserverJSErrorHandlingWorks(t, stdout, 'memserver');
  await testTestJSErrorHandlingWorks(t, stdout, 'memserver');

  WebSocketServer.killWatchers();
  WebSocketServer.close();
  stopStdoutListening();
  mock.removeMock();

  await fs.remove('dummyapp');
});

test.serial('it handles css, js, hbs syntax errors gracefully without fastboot', async (t) => {
  await fs.remove('dummyapp');

  t.plan(127);

  const TARGET_SOCKET_PORT = 8080;
  const mock = mockProcessCWD(PROJECT_ROOT);

  await createAdvancedDummyApp();
  await fs.mkdirp(`${PROJECT_ROOT}/tmp/assets`);

  const { stdout, stopStdoutListening } = listenCurrentStdout();
  const WebSocketServer = await applicationFilesWatcher({
    applicationName: 'dummyapp',
    ENV: {
      environment: 'test',
      modulePrefix: 'dummyapp',
      memserver: { enabled: true }
    },
    buildCache: {},
    cliArguments: { fastboot: true, socketPort: TARGET_SOCKET_PORT, testing: true }
  });

  await new Promise((resolve) => setTimeout(() => resolve(), 3000));
  stdout.length = 0;
  await writeCSSCode('/src/ui/styles/application.scss', CSS_ERROR);

  t.true(getChangeNotificationCount(stdout, '/src/ui/styles/application.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 1);
  t.true(getBuiltNotificationCount(stdout, 'application.css', 'test') === 0);
  t.true(stdoutOccurenceCount(stdout, /ember CSS build error:/g) === 1);

  const firstSocket = new WebSocket(`ws://localhost:${TARGET_SOCKET_PORT}`);
  const secondSocket = new WebSocket(`ws://localhost:${TARGET_SOCKET_PORT}`);

  assertThatSocketReceivesMessage(firstSocket, t);
  assertThatSocketReceivesMessage(secondSocket, t);

  await testCSSErrorHandlingWorks(t, stdout, 'test');
  await testApplicationJSErrorHandlingWorks(t, stdout, 'test');
  await testApplicationHBSErrorHandlingWorks(t, stdout, 'test');
  await testMemserverJSErrorHandlingWorks(t, stdout, 'test');
  await testTestJSErrorHandlingWorks(t, stdout, 'test');

  WebSocketServer.killWatchers();
  WebSocketServer.close();
  stopStdoutListening();
  mock.removeMock();

  await fs.remove('dummyapp');
});

async function testCSSErrorHandlingWorks(t, stdout, environment) {
  await writeCSSCode(
    '/src/ui/styles/application.scss',
    `@import "vendor";
  @import "components";
  .testing-class {
    color: red;
  }
`
  );

  // t.true(getChangeNotificationCount(stdout, '/src/ui/styles/application.scss') === 2);
  // t.true(getBuildingNotificationCount(stdout, 'application.css') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 1);

  const firstContent = await readApplicationCSS();

  t.true(occurrenceCount(firstContent, '.testing-class') === 1);

  await fs.mkdirp(`${PROJECT_ROOT}/src/ui/components/some-component`);
  await writeCSSCode(
    '/src/ui/components/some-component/styles.scss',
    '.some-component { color, purple }'
  );

  t.true(getAddNotificationCount(stdout, '/src/ui/components/some-component/styles.scss') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 3);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 1);
  t.true(stdoutOccurenceCount(stdout, /ember CSS build error:/g) === 2);

  t.true(firstContent === (await readApplicationCSS()));

  await writeCSSCode('/src/ui/styles/application.scss', CSS_ERROR);

  t.true(getChangeNotificationCount(stdout, '/src/ui/styles/application.scss') === 3);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 4);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 1);
  t.true(stdoutOccurenceCount(stdout, /ember CSS build error:/g) === 3);

  t.true(firstContent === (await readApplicationCSS()));

  await writeCSSCode(
    '/src/ui/components/some-component/styles.scss',
    '.some-component { color: purple; }'
  );
  await writeCSSCode(
    '/src/ui/styles/application.scss',
    `@import "vendor";
  @import "components";
  .testing-class {
    color: red;
  }
  `
  );

  t.true(getChangeNotificationCount(stdout, '/src/ui/styles/application.scss') === 4);
  t.true(getBuildingNotificationCount(stdout, 'application.css') === 6);
  t.true(getBuiltNotificationCount(stdout, 'application.css', environment) === 2);
  t.true(stdoutOccurenceCount(stdout, /ember CSS build error:/g) === 4);

  const lastContent = await readApplicationCSS();

  t.true(firstContent !== lastContent);
  t.true(occurrenceCount(lastContent, '.testing-class') === 1);
  t.true(occurrenceCount(lastContent, '.some-component') === 1);
}

async function testApplicationJSErrorHandlingWorks(t, stdout, environment) {
  await writeComponentCode('/welcome-page/component.ts', DEFAULT_EDITED_COMPONENT_JS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 1);
  // t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 1);

  const firstContent = await readApplicationJS();

  t.true(occurrenceCount(firstContent, /there is edited code/g) === 1);

  await fs.mkdirp(`${PROJECT_ROOT}/src/ui/components/dummy-component`);
  await writeComponentCode('/dummy-component/component.ts', JS_TYPO_ERROR);

  t.true(getAddNotificationCount(stdout, '/src/ui/components/dummy-component/component.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 1);
  // t.true(stdoutOccurenceCount(stdout, /application\.js build error!/g) === 2);
  t.true(stdoutOccurenceCount(stdout, /Unexpected token, expected ","/g) === 1); // NOTE: this doesnt tell which file!!

  t.true(firstContent === (await readApplicationJS()));

  await writeComponentCode('/welcome-page/component.ts', JS_FILE_ERROR);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 2);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 1);
  // t.true(stdoutOccurenceCount(stdout, /Unexpected token, expected ","/g) === 2);

  t.true(firstContent === (await readApplicationJS()));

  await writeComponentCode('/dummy-component/component.ts', DEFAULT_EDITED_COMPONENT_JS);
  await writeComponentCode('/welcome-page/component.ts', DEFAULT_EDITED_COMPONENT_JS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/component.ts') === 3);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 5);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 2);

  const lastContent = await readApplicationJS();

  t.true(occurrenceCount(lastContent, /there is edited code/g) === 2);
  t.true(
    codeIncludesAMDModule(lastContent, 'dummyapp/src/ui/components/dummy-component/component')
  );
  t.true(codeIncludesAMDModule(lastContent, 'dummyapp/src/ui/components/welcome-page/component'));
}

async function testApplicationHBSErrorHandlingWorks(t, stdout, environment) {
  await writeComponentCode('/welcome-page/template.hbs', DEFAULT_TEMPLATE_HBS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/template.hbs') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 6);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 3);

  const firstContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(firstContent, 'dummyapp/src/ui/components/welcome-page/template'));

  await fs.mkdirp(`${PROJECT_ROOT}/src/ui/components/dummy-component`);
  await writeComponentCode('/dummy-component/template.hbs', HBS_TYPO_ERROR);

  t.true(getAddNotificationCount(stdout, '/src/ui/components/dummy-component/template.hbs') === 1);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 7);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 3);
  // t.true(stdoutOccurenceCount(stdout, /application\.js build error!/g) === 8);
  t.true(stdoutOccurenceCount(stdout, /message: 'Unclosed element `h1`/g) === 1); // NOTE: this doesnt tell which file!!

  t.true(firstContent === (await readApplicationJS()));

  await writeComponentCode('/welcome-page/template.hbs', HBS_SYNTAX_ERROR);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/template.hbs') === 2);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 8);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 3);
  // t.true(stdoutOccurenceCount(stdout, /application\.js build error!/g) === 12);
  // t.true(stdoutOccurenceCount(stdout, /Error: Parse error on line 3:/g) === 1);

  t.true(firstContent === (await readApplicationJS()));

  await writeComponentCode('/dummy-component/template.hbs', DEFAULT_TEMPLATE_HBS);
  await writeComponentCode('/welcome-page/template.hbs', DEFAULT_TEMPLATE_HBS);

  t.true(getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/template.hbs') === 3);
  t.true(getBuildingNotificationCount(stdout, 'application.js') === 10);
  t.true(getBuiltNotificationCount(stdout, 'application.js', environment) === 4);

  const lastContent = await readApplicationJS();

  t.true(codeIncludesAMDModule(lastContent, 'dummyapp/src/ui/components/dummy-component/template'));
  t.true(codeIncludesAMDModule(lastContent, 'dummyapp/src/ui/components/welcome-page/template'));
}

async function testMemserverJSErrorHandlingWorks(t, stdout, environment) {
  await writeMemServerCode('/models/user.js', DEFAULT_EDITED_MEMSERVER_MODEL_JS);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/user.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', environment) === 1);

  const firstContent = await readMemServerJS();

  t.true(occurrenceCount(firstContent, /modelEditPlaceholder: true/g) === 1);

  await writeMemServerCode('/models/email.js', JS_TYPO_ERROR);

  t.true(getAddNotificationCount(stdout, '/memserver/models/email.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', environment) === 1);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  // t.true(stdoutOccurenceCount(stdout, /memserver\.js build error!/g) === 2);
  // console.log('STDOUT IS');
  // console.log(stdout);
  // t.true(stdoutOccurenceCount(stdout, /Unexpected token, expected ","/g) === 3); // NOTE: this doesnt tell which file!!

  t.true(firstContent === (await readMemServerJS()));

  await writeMemServerCode('/models/user.js', JS_FILE_ERROR);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/user.js') === 2);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', environment) === 1);
  // t.true(stdoutOccurenceCount(stdout, /memserver\.js build error!/g) === 4);
  t.true(stdoutOccurenceCount(stdout, /Unexpected token, expected ","/g) >= 3);

  t.true(firstContent === (await readMemServerJS()));

  await writeMemServerCode('/models/email.js', DEFAULT_EDITED_MEMSERVER_MODEL_JS);
  await writeMemServerCode('/models/user.js', DEFAULT_EDITED_MEMSERVER_MODEL_JS);

  t.true(getChangeNotificationCount(stdout, '/memserver/models/email.js') === 1);
  t.true(getBuildingNotificationCount(stdout, 'memserver.js') === 5);
  t.true(getBuiltNotificationCount(stdout, 'memserver.js', environment) === 2);

  const lastContent = await readMemServerJS();

  t.true(occurrenceCount(lastContent, /modelEditPlaceholder: true/g) === 2);
  t.true(codeIncludesAMDModule(lastContent, 'dummyapp/memserver/models/email'));
  t.true(codeIncludesAMDModule(lastContent, 'dummyapp/memserver/models/user'));
}

async function testTestJSErrorHandlingWorks(t, stdout, environment) {
  await writeIntegrationTestOnComponent(
    '/welcome-page/integration-test.ts',
    DEFAULT_INTEGRATION_TEST_TO_ADD
  );

  t.true(
    getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.ts') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 1);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', environment) === 1);

  const firstContent = await readTestsJS();

  t.true(occurrenceCount(firstContent, /this is added by this test/g) === 1);

  await fs.mkdirp(`${PROJECT_ROOT}/tests/acceptance`);
  await writeAcceptanceTestOnTestFolder('/homepage-test.ts', JS_FILE_ERROR);

  t.true(getAddNotificationCount(stdout, '/tests/acceptance/homepage-test.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 2);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', environment) === 1);
  // t.true(stdoutOccurenceCount(stdout, /tests\.js build error!/g) === 2);
  t.true(stdoutOccurenceCount(stdout, /Unexpected token, expected ","/g) >= 3); // NOTE: this doesnt tell which file

  t.true(firstContent === (await readTestsJS()));

  await writeIntegrationTestOnComponent('/welcome-page/integration-test.ts', JS_TYPO_ERROR);

  t.true(
    getChangeNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.ts') === 2
  );
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 3);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', environment) === 1);
  // t.true(stdoutOccurenceCount(stdout, /tests\.js build error!/g) === 4);
  t.true(stdoutOccurenceCount(stdout, /Unexpected token, expected ","/g) >= 3); // NOTE: this doesnt tell which file!!

  t.true(firstContent === (await readTestsJS()));

  await writeAcceptanceTestOnTestFolder('/homepage-test.ts', DEFAULT_ACCEPTANCE_TEST_TO_ADD);
  await writeIntegrationTestOnComponent(
    '/welcome-page/integration-test.ts',
    DEFAULT_INTEGRATION_TEST_TO_ADD
  );

  t.true(getChangeNotificationCount(stdout, '/tests/acceptance/homepage-test.ts') === 1);
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 5);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', environment) === 2);

  const secondContent = await readTestsJS();

  t.true(occurrenceCount(secondContent, /this is added by this test'/g) === 2);
  t.true(
    codeIncludesAMDModule(secondContent, 'dummyapp/src/ui/components/welcome-page/integration-test')
  );
  t.true(codeIncludesAMDModule(secondContent, 'dummyapp/tests/acceptance/homepage-test'));

  await removeIntegrationTestOnComponent('/welcome-page/integration-test.ts');

  t.true(
    getRemovalNotificationCount(stdout, '/src/ui/components/welcome-page/integration-test.ts') === 1
  );
  t.true(getBuildingNotificationCount(stdout, 'tests.js') === 6);
  t.true(getBuiltNotificationCount(stdout, 'tests.js', environment) === 3);

  const lastContent = await readTestsJS();

  t.true(secondContent !== lastContent);
  t.true(occurrenceCount(lastContent, /this is added by this test'/g) === 1);
  t.true(codeIncludesAMDModule(lastContent, 'dummyapp/tests/acceptance/homepage-test'));
  t.true(
    !codeIncludesAMDModule(lastContent, 'dummyapp/src/ui/components/welcome-page/integration-test')
  );
}

function stdoutOccurenceCount(stdout, targetString) {
  return occurrenceCount(stdout.join('\n'), targetString);
}

function occurrenceCount(sourceString, targetString) {
  return (sourceString.match(targetString) || []).length;
}

function writeCSSCode(path, content) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}${path}`, content);

    setTimeout(() => resolve(), APPLICATION_CSS_BUILD_TIME_THRESHOLD + 700);
  });
}

function writeComponentCode(
  path = '/dummy-component/component.ts',
  content = DEFAULT_COMPONENT_JS
) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), APPLICATION_JS_BUILD_TIME_THRESHOLD + 250);
  });
}

function writeMemServerCode(path, content = DEFAULT_EDITED_MEMSERVER_MODEL_JS) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/memserver${path}`, content);

    setTimeout(() => resolve(), MEMSERVER_JS_BUILD_TIME_THRESHOLD + 700);
  });
}

function writeAcceptanceTestOnTestFolder(path, content = DEFAULT_ACCEPTANCE_TEST_TO_ADD) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/tests/acceptance${path}`, content);

    setTimeout(() => resolve(), TESTS_JS_BUILD_TIME_THRESHOLD + 600);
  });
}

function writeIntegrationTestOnComponent(
  path = '/welcome-page/integration-test.ts',
  content = DEFAULT_INTEGRATION_TEST_TO_ADD
) {
  return new Promise(async (resolve) => {
    await fs.writeFile(`${PROJECT_ROOT}/src/ui/components${path}`, content);

    setTimeout(() => resolve(), TESTS_JS_BUILD_TIME_THRESHOLD + 600);
  });
}

function removeIntegrationTestOnComponent(path = '/welcome-page/integration-test.ts') {
  return new Promise(async (resolve) => {
    await fs.remove(`${PROJECT_ROOT}/src/ui/components${path}`);

    setTimeout(() => resolve(), TESTS_JS_BUILD_TIME_THRESHOLD + 500);
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

export async function readApplicationCSS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`)).toString();
}

export async function readApplicationJS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`)).toString();
}

export async function readTestsJS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/tests.js`)).toString();
}

export async function readMemServerJS() {
  return (await fs.readFile(`${PROJECT_ROOT}/tmp/assets/memserver.js`)).toString();
}
