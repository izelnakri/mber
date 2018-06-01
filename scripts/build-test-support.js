import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import sass from 'node-sass';
import Console from '../lib/utils/console';
import countTime from '../lib/utils/count-time';
import findProjectRoot from '../lib/utils/find-project-root';
import importAddonToAMD from '../lib/transpilers/import-addon-to-amd';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter';

const compileScssAsync = promisify(sass.render);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const PROJECT_PATH = findProjectRoot();
const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
const VENDOR_PATH = `${PROJECT_PATH}/vendor`;
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
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), CSS_FILENAME);

    const timer = countTime();

    Promise.all([
      readFileAsync(`${MODULE_PATH}/qunit/qunit/qunit.css`),
      readFileAsync(`${MODULE_PATH}/ember-qunit/vendor/ember-qunit/test-container-styles.css`),
    ]).then((cssFiles) => {
      return compileScssAsync({
        data: cssFiles.join('\n'),
        outputStyle: 'compressed',
        sourceMap: true,
      });
    }).then((result) => {
      const compiledCSS = result.css.toString();

      writeFileAsync(`${VENDOR_PATH}/${CSS_FILENAME}`, compiledCSS).then(() => {
        const timePassed = timer.stop();

        Console.log(`${chalk.green('BUILT:')} vendor/${CSS_FILENAME} in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}]`);

        resolve(compiledCSS);
      });
    }).catch((error) => console.log('ERROR:', error));
  });
}

function buildTestVendorJS() {
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), JS_FILENAME);

    const timer = countTime();
    return Promise.all([
      readFileAsync(`${VENDOR_PATH}/ember-testing.js`),
      readFileAsync(`${MODULE_PATH}/@ember/test-helpers/vendor/monkey-patches.js`),
      readFileAsync(`${MODULE_PATH}/qunit/qunit/qunit.js`),
      readFileAsync(`${MODULE_PATH}/ember-qunit/vendor/ember-qunit/qunit-configuration.js`),
      importAddonToAMD('@ember/test-helpers', '@ember/test-helpers/addon-test-support/@ember/test-helpers'),
      importAddonToAMD('ember-cli-test-loader/test-support', 'ember-cli-test-loader/addon-test-support'),
      importAddonToAMD('ember-cli-qunit', 'ember-cli-test-loader/addon-test-support'), // NOTE: check if this is needed
      importAddonToAMD('ember-qunit', 'ember-qunit/addon-test-support/ember-qunit'),
      importAddonToAMD('ember-test-helpers', '@ember/test-helpers/addon-test-support/ember-test-helpers'),
      importAddonToAMD('qunit', 'ember-qunit/addon-test-support/qunit')
    ]).then((jsContents) => {
      return writeFileAsync(`${VENDOR_PATH}/${JS_FILENAME}`, 'define = window.define;require = window.require;' + jsContents.join('\n') + `
        runningTests = true;

        if (window.Testem) {
          window.Testem.hookIntoTestFramework();
        }
      `)
    }).then(() => {
      const timePassed = timer.stop();

      readFileAsync(`${VENDOR_PATH}/${JS_FILENAME}`).then((fileBuffer) => {
        Console.log(`${chalk.green('BUILT:')} vendor/${JS_FILENAME} in ${formatTimePassed(timePassed)} [${formatSize(fileBuffer.length)}]`);

        resolve({
          message: `BUILT: ${JS_FILENAME} in ${timePassed}ms [${formatSize(fileBuffer.length)}]`,
          fileBuffer: fileBuffer
        });
      })
    })
  });
}
