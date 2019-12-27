import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const modifierCode = `import { modifier } from 'ember-modifier';

export default modifier((element) => {

});`;

export default async function(name, projectRoot, applicationName) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/modifiers`;

  await fs.mkdirp(TARGET_FOLDER);
  await writeIfNotExist(`${TARGET_FOLDER}/${name}.js`, modifierCode, PROJECT_ROOT);
}
