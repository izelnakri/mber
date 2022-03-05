import workerThreads from 'worker_threads';
import fs from 'fs/promises';
import chalk from 'ansi-colors';
import eslint from 'eslint';
import Console from '../utils/console.js';
import countTime from '../utils/count-time.js';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd.js';
import convertHBSToAMD from '../transpilers/convert-hbs-to-amd.js';
import lintJavaScript from '../utils/lint-javascript.js';
import importAddonFolderToAMD from '../transpilers/import-addon-folder-to-amd.js';
import transpileNPMImports from '../transpilers/transpile-npm-imports.js';
import { formatTimePassed } from '../utils/asset-reporter.js';

const { parentPort, threadId } = workerThreads;

const workerReference = chalk.blue(`[WORKER #${threadId}]`);

Console.log(workerReference, chalk.green('started'));

parentPort.on('error', (error) => Console.error(`${workerReference} error received`, error));
parentPort.on('exit', () => Console.log(`${workerReference} parentPort closed!`));
parentPort.on('online', () => Console.log(`${workerReference} running`));
parentPort.on(
  'message',
  async ({ action, fileNames, applicationName, importObject, projectRoot }) => {
    if (action === 'TRANSPILE_JS') {
      // Console.log(workerReference, chalk.yellow('transpiling JS/TS'));

      Promise.all(
        fileNames.map((fileName) => transpileToES5(fileName, applicationName, projectRoot))
      )
        .then((result) => parentPort.postMessage(result))
        .catch((error) => {
          Console.log(workerReference, chalk.red('ERROR OCCURED DURING TRANSPILATION:'));
          console.log(error);

          parentPort.postMessage({ error: normalizeError(error) });
        });
    } else if (action === 'LINT_JS') {
      Console.log(workerReference, chalk.yellow('linting JS/TS'));

      global.jsLinter = global.jsLinter || new eslint.ESLint();

      try {
        const timer = countTime();

        await lintJavaScript(fileNames, global.jsLinter);

        Console.log(
          workerReference,
          chalk.green(`lint passes successfully in ${formatTimePassed(timer.stop())}`)
        );

        parentPort.postMessage(true);
      } catch (error) {
        console.log('ERROR IS', error);

        parentPort.postMessage({ error: normalizeError(error) });
      }
    } else if (action === 'NPM_IMPORT') {
      const timer = countTime();

      Console.log(workerReference, chalk.yellow(`NPM BUNDLING ${importObject.name}`));

      return transpileNPMImports(importObject.name, importObject.path, importObject.options)
        .then((result) => {
          Console.log(
            workerReference,
            chalk.green(`NPM BUNDLED ${formatTimePassed(timer.stop())} ${importObject.name}`)
          );

          parentPort.postMessage(result);
        })
        .catch((error) => parentPort.postMessage({ error: normalizeError(error) }));
    } else if (action === 'IMPORT_ADDON_TO_AMD') {
      const timer = countTime();

      Console.log(workerReference, chalk.yellow(`BUNDLING ${importObject.name}`));

      return importAddonToAMD(importObject.name, importObject.path, {
        applicationName,
        projectRoot
      })
        .then((result) => {
          Console.log(
            workerReference,
            chalk.green(`BUNDLED ${formatTimePassed(timer.stop())} ${importObject.name}`)
          );

          parentPort.postMessage(result);
        })
        .catch((error) => parentPort.postMessage({ error: normalizeError(error) }));
    }
  }
);

function transpileToES5(fileName, appName, projectRoot) {
  return new Promise(async (resolve, reject) => {
    return fs
      .readFile(fileName)
      .then((fileContents) => {
        if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
          return convertESModuletoAMD(fileContents, {
            moduleName: getModuleName(fileName, appName, projectRoot)
          });
        } else if (fileName.endsWith('.hbs')) {
          return convertHBSToAMD(fileContents, {
            moduleName: getModuleName(fileName, appName, projectRoot)
          });
        }

        resolve('');
      })
      .then((content) => resolve(content))
      .catch((error) => reject(error));
  });
}

function normalizeError(errorObject) {
  return Object.keys(errorObject).reduce(
    (result, key) => {
      return Object.assign(result, { [key]: errorObject[key] });
    },
    { message: errorObject.message, name: errorObject.name }
  );
}

function getModuleName(fileName, applicationName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  if (moduleName.startsWith('src/ui/modifiers')) {
    return `${applicationName}/modifiers/${moduleName
      .slice(0, moduleName.lastIndexOf('.'))
      .replace('src/ui/modifiers/', '')}`;
  }

  return `${applicationName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

function importAddonToAMD(name, path, { applicationName, projectRoot }) {
  return new Promise((resolve, reject) => {
    Promise.all([
      importAddonFolderToAMD(name, `${path}/addon`, projectRoot),
      importAddonFolderToAMD(applicationName, `${path}/app`, projectRoot)
    ])
      .then((content) => resolve(content.join('\n')))
      .catch((error) => {
        console.log('error is', error);
        reject(error);
      });
  });
}
