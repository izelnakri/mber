import fs from 'fs-extra';
import chalk from 'ansi-colors';
import Console from '../lib/utils/console.js';
import findProjectRoot from '../lib/utils/find-project-root.js';
import countTime from '../lib/utils/count-time.js';
import importAddonFolderToAMD from '../lib/transpilers/import-addon-folder-to-amd.js';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter.js';

const FILENAME = 'fastboot-addon-modules.js';

function transpileFastbootModules() {
  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING:'), `${FILENAME}...`);

    const timer = countTime();

    const PROJECT_PATH = await findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_PATH}/vendor/fastboot/${FILENAME}`;
    const MODULE_PATH = `${PROJECT_PATH}/node_modules/ember-cli-fastboot`;

    await Promise.all([
      fs.ensureDir(`${PROJECT_PATH}/vendor/fastboot`),
      fs.ensureDir(`${PROJECT_PATH}/vendor/fetch`),
      fs.ensureDir(`${PROJECT_PATH}/vendor/fastboot/initializers`)
    ]);

    return Promise.all([
      importAddonFolderToAMD('ember-cli-fastboot', 'ember-cli-fastboot/addon'),
      fs.copyFile(
        `${MODULE_PATH}/fastboot/initializers/ajax.js`,
        `${PROJECT_PATH}/vendor/fastboot/initializers/ajax.js`
      ),
      fs.copyFile(
        `${MODULE_PATH}/vendor/experimental-render-mode-rehydrate.js`,
        `${PROJECT_PATH}/vendor/fastboot/experimental-render-mode-rehydrate.js`
      ),
      fs.copyFile(
        `${PROJECT_PATH}/scripts/fetch-fastboot-shim.js`,
        `${PROJECT_PATH}/vendor/fetch/fetch-fastboot-shim.js`
      )
    ])
      .then(([fastbootAddon]) => {
        return fs.writeFile(OUTPUT_PATH, fastbootAddon);
      })
      .then(() => {
        const timePassed = timer.stop();

        fs.readFile(OUTPUT_PATH).then((fileBuffer) => {
          Console.log(
            `${chalk.green('BUILT:')} ${OUTPUT_PATH} in ${formatTimePassed(
              timePassed
            )} [${formatSize(fileBuffer.length)}]`
          );

          resolve({
            message: `BUILT: ${FILENAME} in ${timePassed}ms [${formatSize(fileBuffer.length)}]`,
            fileBuffer: fileBuffer
          });
        });
      })
      .catch((error) => console.log('ERROR OCCURED:', error));
  });
}

transpileFastbootModules();
