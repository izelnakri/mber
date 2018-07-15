import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const serviceCode = `import Service from '@ember/service';

export default Service.extend({
});
`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/services/${name}`;

  await Promise.all([
    writeIfNotExist(`${TARGET_FILE_NAME}.js`, serviceCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FILE_NAME}-test.js`, getServiceTestCode(name), PROJECT_ROOT)
  ]);
}

function getServiceTestCode(name) {
  return `import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

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
