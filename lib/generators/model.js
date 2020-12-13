import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const modelCode = (className) => `import Model from '@ember-data/model';

export default class ${className} extends Model {
}`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/data/models/${name}`;
  const className = classify(name);

  await fs.mkdir(TARGET_FOLDER, { recursive: true });
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/model.ts`, modelCode(className), PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/unit-test.ts`,
      getTestCode(name, applicationName),
      PROJECT_ROOT
    )
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
`;
}

function classify(name) {
  return name
    .split('-')
    .map((word) => {
      return word.slice(0, 1).toUpperCase() + word.slice(1);
    })
    .join('');
}
