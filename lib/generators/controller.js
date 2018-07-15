import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const controllerCode = `import Controller from '@ember/controller';

export default Controller.extend({
});
`

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/routes/${name}`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/controller.js`, controllerCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/controller-test.js`, getControllerTestCode(name), PROJECT_ROOT)
  ]);
}

function getControllerTestCode(name) {
  return `import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Controller | ${name}', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let controller = this.owner.lookup('controller:${name}');
    assert.ok(controller);
  });
});
`
}
