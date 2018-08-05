import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const mixinCode = `import Mixin from '@ember/object/mixin';

export default Mixin.create({
});
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || await findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/utils/mixins`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/${name}.js`, mixinCode, PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/${name}-test.js`,
      getMixinTestCode(name, applicationName),
      PROJECT_ROOT
    ),
  ]);
}

function getMixinTestCode(name, applicationName) {
  const mixinClassName = `${classify(name)}Mixin`;

  return `import { module, test } from 'qunit';
import EmberObject from '@ember/object';
import { setupTest } from '${applicationName}/tests/helpers';
import ${mixinClassName} from './${name}';

module('Unit | Mixin | ${name}', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it works', function (assert) {
    let ${classify(name)}Object = EmberObject.extend(AuthMixin);
    let subject = ${mixinClassName}.create();

    assert.ok(subject);
  });
});
`
}

function classify(name) {
  return name.split('-').map((word) => {
    return word.slice(0, 1).toUpperCase() + word.slice(1);
  }).join('');
}
