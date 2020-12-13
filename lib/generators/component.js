import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const componentCode = (componentName) => `import Component from '@glimmer/component';

export default class ${componentName} extends Component {
};`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/components/${name}`;
  const componentClassName = classify(name.replace('/', '-'));

  await fs.mkdir(TARGET_FOLDER, { recursive: true });
  await Promise.all([
    writeIfNotExist(
      `${TARGET_FOLDER}/component.ts`,
      componentCode(componentClassName),
      PROJECT_ROOT
    ),
    writeIfNotExist(`${TARGET_FOLDER}/template.hbs`, '{{yield}}', PROJECT_ROOT),
    writeIfNotExist(`${TARGET_FOLDER}/styles.scss`, '', PROJECT_ROOT),
    writeIfNotExist(
      `${TARGET_FOLDER}/integration-test.ts`,
      getIntegrationTestCode(componentClassName, applicationName),
      PROJECT_ROOT
    )
  ]);
}

function getIntegrationTestCode(className, applicationName) {
  return `import { module, test } from 'qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { setupRenderingTest } from '${applicationName}/tests/helpers';

module('Integration | Component | ${className}', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs\`<${className}/\>\`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs\`
      <${className}>
        template block text
      </${className}>
    \`);

    assert.equal(this.element.textContent.trim(), 'template block text');
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
