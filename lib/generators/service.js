import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const serviceCode = `import Service from '@ember/service';

export default Service.extend({
});
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || await findProjectRoot();
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/services/${name}`;

  await fs.mkdirp(`${PROJECT_ROOT}/src/services`);
  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.js`, serviceCode, PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FILE_NAME}-test.js`,
      getServiceTestCode(name, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getServiceTestCode(name, applicationName) {
  return `import { module, test } from 'qunit';
import { setupTest } from '${applicationName}/tests/helpers';

module('Unit | Service | ${name}', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:${name}');

    assert.ok(service);
  });
});
`;
}
