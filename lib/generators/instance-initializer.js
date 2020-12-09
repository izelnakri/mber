import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const instanceInitializerCode = `export function initialize(/* appInstance */) {
  // appInstance.inject('route', 'foo', 'service:foo');
}

export default {
  initialize
};
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/init/instance-initializers/${name}`;

  await fs.mkdir(`${PROJECT_ROOT}/src/init/instance-initializers`, { recursive: true });
  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.ts`, instanceInitializerCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FILE_NAME}-test.ts`, getTestCode(name, applicationName), PROJECT_ROOT)
  ]);
}

function getTestCode(name, applicationName) {
  return `import Application from '@ember/application';
import { module, test } from 'qunit';
import { run } from '@ember/runloop';
import { setupTest } from '${applicationName}/tests/helpers';
import { initialize } from './${name}';

module('Unit | Instance Initializer | ${name}', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.TestApplication = Application.extend();
    this.TestApplication.instanceInitializer({
      name: 'initializer under test',
      initialize
    });
    this.application = this.TestApplication.create({ autoboot: false });
    this.instance = this.application.buildInstance();
  });
  hooks.afterEach(function() {
    run(this.application, 'destroy');
    run(this.instance, 'destroy');
  });

  // Replace this with your real tests.
  test('it works', async function(assert) {
    await this.instance.boot();

    assert.ok(true);
  });
});
`;
}
