import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const modelCode = `import DS from 'ember-data';

export default DS.Model.extend({

});
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/data/models/${name}`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/model.js`, modelCode, PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/unit-test.js`,
      getTestCode(name, applicationName),
      PROJECT_ROOT
    ),
  ]);
}

function getTestCode(name, applicationName) {
  return `import { module, test } from 'qunit';
import { setupTest } from '${applicationName}/tests/helpers';

module('Unit | Model | ${name}', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let store = this.owner.lookup('service:store');
    let model = store.createRecord('${name}', {});

    assert.ok(model);
  });
});
`
}
