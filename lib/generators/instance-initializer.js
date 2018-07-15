import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const instanceInitializerCode = `export function initialize(/* appInstance */) {
  // appInstance.inject('route', 'foo', 'service:foo');
}

export default {
  initialize
};
`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/init/instance-initializers/${name}`;

  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.js`, instanceInitializerCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FILE_NAME}-test.js`, getTestCode(name), PROJECT_ROOT)
  ]);
}

function getTestCode(name) {
  return `import Application from '@ember/application';

import { initialize } from './${name}';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';

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
