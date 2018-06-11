import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import Console from '../lib/utils/console';
import findProjectRoot from '../lib/utils/find-project-root';
import countTime from '../lib/utils/count-time';
import convertESModuleToAMD from '../lib/transpilers/convert-es-module-to-amd';
import importAddonToAMD from '../lib/transpilers/import-addon-to-amd';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter';

const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const FILENAME = 'fastboot-modules.js';

function transpileFastbootModules() {
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), `${FILENAME}...`);

    const timer = countTime();

    const PROJECT_PATH = findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_PATH}/vendor/${FILENAME}`;
    const MODULE_PATH = `${PROJECT_PATH}/node_modules/ember-cli-fastboot`;

    return Promise.all([
      readFileAsync(`${MODULE_PATH}/fastboot/initializers/ajax.js`),
      readFileAsync(`${MODULE_PATH}/fastboot/initializers/error-handler.js`),
      importAddonToAMD('ember-cli-fastboot', 'ember-cli-fastboot/addon'),
      copyFileAsync(`${MODULE_PATH}/vendor/experimental-render-mode-rehydrate.js`, `${PROJECT_PATH}/vendor/experimental-render-mode-rehydrate.js`),
      copyFileAsync(`${MODULE_PATH}/lib/utilities/fastboot-app-module.js`, `${PROJECT_PATH}/vendor/fastboot-app-module.js`)
    ]).then(([ajaxInitializer, errorHandler, fastbootAddon]) => {
      const AJAX_INITIALIZER_CODE = convertESModuleToAMD(ajaxInitializer.toString(), {
        moduleName: 'ember-cli-fastboot/addon/initializers/ajax'
      });
      const ERROR_HANDLER_INITIALIZER_CODE = convertESModuleToAMD(errorHandler.toString(), {
        moduleName: 'ember-cli-fastboot/addon/initializers/error-handler'
      });

      return writeFileAsync(OUTPUT_PATH, `
        ${fastbootAddon}
        ${AJAX_INITIALIZER_CODE}
        ${ERROR_HANDLER_INITIALIZER_CODE}
      `);
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
