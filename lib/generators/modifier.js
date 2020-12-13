import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';
import writeIfNotExist from '../utils/write-if-not-exists.js';

const modifierCode = `import { modifier } from 'ember-modifier';

export default modifier((element) => {

});`;

export default async function(name, projectRoot) {
  const PROJECT_ROOT = projectRoot || (await findProjectRoot());
  const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/modifiers`;

  await fs.mkdir(TARGET_FOLDER, { recursive: true });
  await writeIfNotExist(`${TARGET_FOLDER}/${name}.ts`, modifierCode, PROJECT_ROOT);
}
