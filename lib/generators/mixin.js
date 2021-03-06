import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const mixinCode = (className) => `export default class ${className} {
};`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/utils/mixins`;
  const className = classify(name);

  await fs.mkdir(TARGET_FOLDER, { recursive: true });
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/${name}.ts`, mixinCode(className), PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/${name}-test.ts`,
      getMixinTestCode(name, className, applicationName),
      PROJECT_ROOT
    )
  ]);
}

// TODO: apply the mixin here
function getMixinTestCode(name, className, applicationName) {
  const mixinClassName = `${classify(name)}Mixin`;
  const objectClassName = `${classify(name)}Object`;

  return `import { module, test } from 'qunit';
import EmberObject from '@ember/object';
import { setupTest } from '${applicationName}/tests/helpers';
import ${mixinClassName} from './${name}';

module('Unit | Mixin | ${className}', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it works', function (assert) {
    class ${objectClassName} {};

    let subject = new ${objectClassName}();

    assert.ok(subject);
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
