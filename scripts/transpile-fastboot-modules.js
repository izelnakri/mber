import fs from 'fs-extra';
import { promisify } from 'util';
import chalk from 'chalk';
import Console from '../lib/utils/console';
import findProjectRoot from '../lib/utils/find-project-root';
import countTime from '../lib/utils/count-time';
import importAddonFolderToAMD from '../lib/transpilers/import-addon-folder-to-amd';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter';

const ensudeDirAsync = promisify(fs.ensureDir);
const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const FILENAME = 'fastboot-addon-modules.js';

function transpileFastbootModules() {
  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING:'), `${FILENAME}...`);

    const timer = countTime();

    const PROJECT_PATH = findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_PATH}/vendor/fastboot/${FILENAME}`;
    const MODULE_PATH = `${PROJECT_PATH}/node_modules/ember-cli-fastboot`;

    await ensudeDirAsync(`${PROJECT_PATH}/vendor/fastboot`);
    await ensudeDirAsync(`${PROJECT_PATH}/vendor/fastboot/initializers`);

    return Promise.all([
      importAddonFolderToAMD('ember-cli-fastboot', 'ember-cli-fastboot/addon'),
      copyFileAsync(`${MODULE_PATH}/fastboot/initializers/ajax.js`, `${PROJECT_PATH}/vendor/fastboot/initializers/ajax.js`),
      copyFileAsync(`${MODULE_PATH}/fastboot/initializers/error-handler.js`, `${PROJECT_PATH}/vendor/fastboot/initializers/error-handler.js`),
      copyFileAsync(`${MODULE_PATH}/vendor/experimental-render-mode-rehydrate.js`, `${PROJECT_PATH}/vendor/fastboot/experimental-render-mode-rehydrate.js`),
      copyFileAsync(`${MODULE_PATH}/vendor/experimental-render-mode-rehydrate.js`, `${PROJECT_PATH}/vendor/fastboot/experimental-render-mode-rehydrate.js`),
      copyFileAsync(`${MODULE_PATH}/lib/utilities/fastboot-app-module.js`, `${PROJECT_PATH}/vendor/fastboot/fastboot-app-module.js`)
    ]).then(([fastbootAddon]) => {
      return writeFileAsync(OUTPUT_PATH, fastbootAddon);
    }).then(() => {
      const timePassed = timer.stop();

      readFileAsync(OUTPUT_PATH).then((fileBuffer) => {
        Console.log(`${chalk.green('BUILT:')} ${OUTPUT_PATH} in ${formatTimePassed(timePassed)} [${formatSize(fileBuffer.length)}]`);

        resolve({
          message: `BUILT: ${FILENAME} in ${timePassed}ms [${formatSize(fileBuffer.length)}]`,
          fileBuffer: fileBuffer
        });
      });
    }).catch((error) => console.log('ERROR OCCURED:', error));
  })
}

transpileFastbootModules();
