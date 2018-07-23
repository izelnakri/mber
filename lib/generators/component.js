import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import writeIfNotExist from '../utils/write-if-not-exists';

const componentCode = `import Component from '@ember/component';

export default Component.extend({
});
`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || findProjectRoot();
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/components/${name}`;

  await fs.mkdirp(TARGET_FOLDER);
  await Promise.all([
    writeIfNotExist(`${TARGET_FOLDER}/component.js`, componentCode, PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/template.hbs`, '{{yield}}', PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/styles.scss`, '', PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/integration-test.js`,
      getIntegrationTestCode(name, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getIntegrationTestCode(name, applicationName) {
  return `import { module, test } from 'qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { setupRenderingTest } from '${applicationName}/tests/helpers';

module('Integration | Component | ${name}', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs\`{{${name}}}\`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs\`
      {{#${name}}}
        template block text
      {{/${name}}}
    \`);

    assert.equal(this.element.textContent.trim(), 'template block text');
  });
});
`
}
