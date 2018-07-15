import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const utilCode = `export default function() {
  return true;
}
`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/utils`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/${name}.js`, utilCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/${name}-test.js`, getUtilTestCode(name), PROJECT_ROOT),
  ]);
}

function getUtilTestCode(name) {
  const importName = camelize(name);

  return `import ${importName} from './${name}';
import { module, test } from 'qunit';

module('Unit | Util | ${name}', function() {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let result = ${importName}();
    assert.ok(result);
  });
});
`
}

function camelize(name) {
  return name.split('-').map((word, index) => {
    if (index === 0) {
      return word;
    }

    return word.slice(0, 1).toUpperCase() + word.slice(1);
  }).join('');
}
