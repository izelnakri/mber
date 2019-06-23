import fs from 'fs-extra';
import { promisify } from 'util';
import chalk from 'ansi-colors';
import sass from 'sass';
import Console from '../lib/utils/console.js';
import countTime from '../lib/utils/count-time.js';
import findProjectRoot from '../lib/utils/find-project-root.js';
import importAddonFolderToAMD from '../lib/transpilers/import-addon-folder-to-amd.js';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter.js';

const compileScssAsync = promisify(sass.render);

const CSS_FILENAME = 'test-support.css';
const JS_FILENAME = 'test-support.js';

function build() {
  return Promise.all([
    buildTestVendorCSS(),
    buildTestVendorJS()
  ])
}

build();

function buildTestVendorCSS() {
  return new Promise(async (resolve) => {
    const PROJECT_PATH = await findProjectRoot();
    const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
    const VENDOR_PATH = `${PROJECT_PATH}/vendor`;

    Console.log(chalk.yellow('BUILDING:'), CSS_FILENAME);

    const timer = countTime();

    Promise.all([
      fs.readFile(`${MODULE_PATH}/qunit/qunit/qunit.css`),
      fs.readFile(`${MODULE_PATH}/ember-qunit/vendor/ember-qunit/test-container-styles.css`),
    ]).then((cssFiles) => {
      return compileScssAsync({
        data: cssFiles.join('\n'),
        outputStyle: 'compressed',
        sourceMap: true,
      });
    }).then((result) => {
      const compiledCSS = result.css.toString();

      fs.writeFile(`${VENDOR_PATH}/${CSS_FILENAME}`, compiledCSS).then(() => {
        const timePassed = timer.stop();

        Console.log(`${chalk.green('BUILT:')} vendor/${CSS_FILENAME} in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}]`);

        resolve(compiledCSS);
      });
    }).catch((error) => console.log('ERROR:', error));
  });
}

function buildTestVendorJS() {
  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING:'), JS_FILENAME);
    const PROJECT_PATH = await findProjectRoot();
    const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
    const VENDOR_PATH = `${PROJECT_PATH}/vendor`;
    const timer = countTime();

    return Promise.all([
      fs.readFile(`${VENDOR_PATH}/ember-testing.js`),
      fs.readFile(`${MODULE_PATH}/@ember/test-helpers/vendor/monkey-patches.js`),
      fs.readFile(`${MODULE_PATH}/qunit/qunit/qunit.js`),
      fs.readFile(`${MODULE_PATH}/ember-qunit/vendor/ember-qunit/qunit-configuration.js`),
      importAddonFolderToAMD('@ember/test-helpers', '@ember/test-helpers/addon-test-support/@ember/test-helpers'),
      importAddonFolderToAMD('ember-cli-test-loader/test-support', 'ember-cli-test-loader/addon-test-support'),
      importAddonFolderToAMD('ember-cli-qunit', 'ember-cli-test-loader/addon-test-support'), // NOTE: check if this is needed
      importAddonFolderToAMD('ember-qunit', 'ember-qunit/addon-test-support/ember-qunit'),
      importAddonFolderToAMD('ember-test-helpers', '@ember/test-helpers/addon-test-support/ember-test-helpers'),
      importAddonFolderToAMD('qunit', 'ember-qunit/addon-test-support/qunit')
    ]).then((jsContents) => {
      return fs.writeFile(`${VENDOR_PATH}/${JS_FILENAME}`, 'define = window.define;require = window.require;' + jsContents.join('\n') + `
        runningTests = true;
      `)
    }).then(() => {
      const timePassed = timer.stop();

      fs.readFile(`${VENDOR_PATH}/${JS_FILENAME}`).then((fileBuffer) => {
        Console.log(`${chalk.green('BUILT:')} vendor/${JS_FILENAME} in ${formatTimePassed(timePassed)} [${formatSize(fileBuffer.length)}]`);

        resolve({
          message: `BUILT: ${JS_FILENAME} in ${timePassed}ms [${formatSize(fileBuffer.length)}]`,
          fileBuffer: fileBuffer
        });
      })
    })
  });
}
