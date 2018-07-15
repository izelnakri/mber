import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const initializerCode = `export function initialize(/* application */) {
  // application.inject('route', 'foo', 'service:foo');
}

export default {
  initialize
};
`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/init/initializers/${name}`;

  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.js`, initializerCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FILE_NAME}-test.js`, getInitializerTestCode(name), PROJECT_ROOT)
  ]);
}

function getInitializerTestCode(name) {
  return `import Application from '@ember/application';

import { initialize } from './${name}';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';

module('Unit | Initializer | ${name}', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.TestApplication = Application.extend();
    this.TestApplication.initializer({
      name: 'initializer under test',
      initialize
    });

    this.application = this.TestApplication.create({ autoboot: false });
  });

  hooks.afterEach(function() {
    run(this.application, 'destroy');
  });

  // Replace this with your real tests.
  test('it works', async function(assert) {
    await this.application.boot();

    assert.ok(true);
  });
});
`;
}
