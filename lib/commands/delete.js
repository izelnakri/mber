import chalk from 'ansi-colors';
import fs from 'fs-extra';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';

export default async function(abstractionType, name) {
  const PROJECT_ROOT = await findProjectRoot();

  if (!name) {
    Console.error(`$ mber delete ${abstractionType} [name] missing a name!`);
    process.exit(1);
  } else if (abstractionType === 'component') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/components/${name}`;

    await checkIfPathExists(TARGET_FOLDER, PROJECT_ROOT);
    await removeFolder(TARGET_FOLDER, PROJECT_ROOT);
  } else if (abstractionType === 'controller') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/routes/${name}`;

    await checkIfPathExists(TARGET_FOLDER, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FOLDER}/controller.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FOLDER}/controller-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'helper') {
    const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/ui/components/${name}`;

    await checkIfPathExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FILE_NAME}-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'initializer') {
    const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/init/initializers/${name}`;

    await checkIfPathExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FILE_NAME}-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'instance-initializer') {
    const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/init/instance-initializers/${name}`;

    await checkIfPathExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FILE_NAME}-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'mixin') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/utils/mixins`;
    const TARGET_FILE_NAME = `${TARGET_FOLDER}/${name}`;

    await checkIfPathExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FILE_NAME}-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'model') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/data/models/${name}`;

    await checkIfPathExists(TARGET_FOLDER, PROJECT_ROOT);
    await removeFolder(TARGET_FOLDER, PROJECT_ROOT);
  } else if (abstractionType === 'route') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/ui/routes/${name}`;

    await checkIfPathExists(TARGET_FOLDER, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FOLDER}/route.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FOLDER}/template.hbs`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FOLDER}/styles.scss`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FOLDER}/acceptance-test.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FOLDER}/unit-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'service') {
    const TARGET_FILE_NAME = `${PROJECT_ROOT}/src/services/${name}`;

    await checkIfPathExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FILE_NAME}.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FILE_NAME}-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'util') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/utils`;

    await checkIfPathExists(`${TARGET_FOLDER}/${name}.js`, PROJECT_ROOT);
    await Promise.all([
      removeIfExists(`${TARGET_FOLDER}/${name}.js`, PROJECT_ROOT),
      removeIfExists(`${TARGET_FOLDER}/${name}-test.js`, PROJECT_ROOT)
    ]);
  } else if (abstractionType === 'modifier') {
    const TARGET_FOLDER = `${PROJECT_ROOT}/src/modifiers`;

    await removeIfExists(`${TARGET_FOLDER}/${name}.js`, PROJECT_ROOT);
  } else {
    Console.error(`${abstractionType} is not a valid ember abstraction to remove`);
    process.exit(1);
  }
}

async function checkIfPathExists(path, projectRoot) {
  if (!(await fs.exists(path))) {
    const targetPath = path.replace(`${projectRoot}/`, '');

    Console.error(`${targetPath} does not exist!`);
    process.exit(1);
  }
}

async function removeIfExists(path, projectRoot) {
  return new Promise(async (resolve) => {
    if (await fs.exists(path)) {
      fs.remove(path);
      Console.log(chalk.red('deleted'), path.replace(`${projectRoot}/`, ''));
    }

    resolve();
  });
}

async function removeFolder(path, projectRoot) {
  return new Promise(async (resolve) => {
    fs.remove(path);
    Console.log(chalk.red('deleted'), path.replace(`${projectRoot}/`, ''));
    resolve();
  });
}
