import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const serviceCode = (className) => `import Service from '@ember/service';

export default class ${className}Service extends Service {
}`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/services/${name}`;
  const className = classify(name);

  await fs.mkdirp(`${PROJECT_ROOT}/src/services`);
  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.ts`, serviceCode(className), PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FILE_NAME}-test.ts`,
      getServiceTestCode(name, className, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getServiceTestCode(name, className, applicationName) {
  return `import { module, test } from 'qunit';
import { setupTest } from '${applicationName}/tests/helpers';

module('Unit | Service | ${className}', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:${name}');

    assert.ok(service);
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
