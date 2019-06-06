import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const routeCode = `import Route from '@ember/routing/route';

export default Route.extend({
});
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || await findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/routes/${name}`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/route.js`, routeCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/template.hbs`, '{{outlet}}', PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/styles.scss`, '', PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/acceptance-test.js`,
      getAcceptanceTestCode(name, applicationName),
      PROJECT_ROOT
    ),
    writeIfNotExist(
      `${TARGET_FOLDER}/unit-test.js`,
      getUnitTestCode(name, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getAcceptanceTestCode(name, applicationName) {
  return `import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from '${applicationName}/tests/helpers';

module('Acceptance | ${name}', function(hooks) {
  setupApplicationTest(hooks);

  // test('visiting /route', async function(assert) {
  //   await visit('/route');
  //
  //   assert.equal(currentURL(), '/route');
  // });
});
`
}

function getUnitTestCode(name, applicationName) {
  return `import { module, test } from 'qunit';
import { setupTest } from '${applicationName}/tests/helpers';

module('Unit | Route | ${name}', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:${name}');

    assert.ok(route);
  });
});
`;
}
