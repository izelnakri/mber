import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const helperCode = `import Helper from '@ember/component/helper';

export let helper = Helper.helper((params/*, hash*/) => {
  return params;
});
`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FILE = `${PROJECT_ROOT}/src/ui/components/${name}`;

  await Promise.all([
    writeIfNotExist(`${TARGET_FILE}.js`, helperCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FILE}-test.js`, getHelperTestCode(name), PROJECT_ROOT)
  ]);
}

function getHelperTestCode(name) {
  return `import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Helper | ${name}', function(hooks) {
  setupRenderingTest(hooks);

  // Replace this with your real tests.
  test('it renders', async function(assert) {
    this.set('inputValue', '1234');

    await render(hbs\`{{${name} inputValue}}\`);

    assert.equal(this.element.textContent.trim(), '1234');
  });
});
`;
}