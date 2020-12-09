import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const routeCode = (className) => `import Route from '@ember/routing/route';

export default class ${className}Route extends Route {
}`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/routes/${name}`;
  const className = classify(name.replace('/', '-'));

  await fs.mkdir(TARGET_FOLDER, { recursive: true });
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/route.ts`, routeCode(className), PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/template.hbs`, '{{outlet}}', PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/styles.scss`, '', PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/acceptance-test.ts`,
      getAcceptanceTestCode(name, className, applicationName),
      PROJECT_ROOT
    ),
    writeIfNotExist(
      `${TARGET_FOLDER}/unit-test.ts`,
      getUnitTestCode(name, className, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getAcceptanceTestCode(name, className, applicationName) {
  return `import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from '${applicationName}/tests/helpers';

module('Acceptance | ${className}', function(hooks) {
  setupApplicationTest(hooks);

  // test('visiting /route', async function(assert) {
  //   await visit('/route');
  //
  //   assert.equal(currentURL(), '/route');
  // });
});
`;
}

function getUnitTestCode(name, className, applicationName) {
  return `import { module, test } from 'qunit';
import { setupTest } from '${applicationName}/tests/helpers';

module('Unit | Route | ${className}', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:${name}');

    assert.ok(route);
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
