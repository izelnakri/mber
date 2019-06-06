import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const initializerCode = `export function initialize(/* application */) {
  // application.inject('route', 'foo', 'service:foo');
}

export default {
  initialize
};
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || await findProjectRoot();
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/init/initializers/${name}`;

  await fs.mkdirp(`${PROJECT_ROOT}/src/init/initializers`);
  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.js`, initializerCode, PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FILE_NAME}-test.js`,
      getInitializerTestCode(name, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getInitializerTestCode(name, applicationName) {
  return `import Application from '@ember/application';
import { module, test } from 'qunit';
import { run } from '@ember/runloop';
import { setupTest } from '${applicationName}/tests/helpers';
import { initialize } from './${name}';

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
