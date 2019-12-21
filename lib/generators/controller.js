import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const controllerCode = (className) => `import Controller from '@ember/controller';

export default class ${className}Controller extends Controller {
}`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/routes/${name}`;
  const className = classify(name);

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/controller.js`, controllerCode(className), PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/controller-test.js`,
      getControllerTestCode(name, className, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getControllerTestCode(name, className, applicationName) {
  return `import { module, test } from 'qunit';
import { setupTest } from '${applicationName}/tests/helpers';

module('Unit | Controller | ${className}Controller', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let controller = this.owner.lookup('controller:${name}');

    assert.ok(controller);
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
