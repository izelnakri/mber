import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const mixinCode = `import Mixin from '@ember/object/mixin';

export default Mixin.create({
});
`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/utils/mixins`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/${name}.js`, mixinCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/${name}-test.js`, getMixinTestCode(name), PROJECT_ROOT),
  ]);
}

function getMixinTestCode(name) {
  const mixinClassName = `${classify(name)}Mixin`;

  return `import EmberObject from '@ember/object';
import ${mixinClassName} from './${name}';
import { module, test } from 'qunit';

module('Unit | Mixin | ${name}', function() {
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
