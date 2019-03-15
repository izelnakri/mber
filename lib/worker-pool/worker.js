require = require('esm')(module); // eslint-disable-line

const CWD = `${process.cwd()}`;

const { parentPort, threadId } = require('worker_threads');
const fs = require('fs-extra');
const Console = require(`${CWD}/../lib/utils/console`).default;
const convertESModuletoAMD  = require(`${CWD}/../lib/transpilers/convert-es-module-to-amd`).default;
const convertHBSToAMD = require(`${CWD}/../lib/transpilers/convert-hbs-to-amd`).default;
const lintJavaScript = require('../utils/lint-javascript').default;
const importAddonFolderToAMD = require(`${CWD}/../lib/transpilers/import-addon-folder-to-amd`).default;
const transpileNPMImports = require(`${CWD}/../lib/transpilers/transpile-npm-imports`).default;

const workerReference = `[WORKER #${threadId}]`;

Console.log(`${workerReference} started`);

parentPort.on('error', (error) => Console.error(`${workerReference} error received`, error));
parentPort.on('exit', () => Console.log(`${workerReference} parentPort closed!`));
parentPort.on('online', () => Console.log(`${workerReference} running`));
parentPort.on('message', ({ action, fileNames, applicationName, importObject, projectRoot, buildConfig }) => {
  if (action === 'TRANSPILE_JS') {
    Console.log(`${workerReference} transpiling JS/TS`);

    Promise.all(fileNames.map((fileName) => transpileToES5(fileName, applicationName, projectRoot)))
      .then((result) => parentPort.postMessage(result))
      .catch((error) => {
        Console.log(`${workerReference} - ERROR OCCURED DURING TRANSPILATION:`);
        console.log(error);

        parentPort.postMessage({ error: normalizeError(error) })
      });
  } else if (action === 'LINT_JS') {
    Console.log(`${workerReference} linting JS/TS`);

    parentPort.postMessage('');
    // try {
    //   lintJavaScript(fileNames, buildConfig)
    // } catch (error) {
    //   console.log('ERROR IS', error);
    //   parentPort.postMessage({ error: normalizeError(error) });
    // }
  } else if (action === 'NPM_IMPORT') {
    Console.log(`${workerReference} NPM BUNDLING ${importObject.name}`);

    return transpileNPMImports(importObject.name, importObject.path, importObject.options)
      .then((result) => parentPort.postMessage(result))
      .catch((error) => parentPort.postMessage({ error: normalizeError(error) }));
  } else if (action === 'IMPORT_ADDON_TO_AMD') {
    Console.log(`${workerReference} BUNDLING ${importObject.name}`);

    return importAddonToAMD(importObject.name, importObject.path, { applicationName, projectRoot })
      .then((result) => parentPort.postMessage(result))
      .catch((error) => parentPort.postMessage({ error: normalizeError(error) }));
  }
});

function transpileToES5(fileName, appName, projectRoot) {
  return new Promise((resolve, reject) => {
    return fs.readFile(fileName).then((fileContents) => {
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        return convertESModuletoAMD(fileContents, {
          moduleName: getModuleName(fileName, appName, projectRoot)
        });
      } else if (fileName.endsWith('.hbs')) {
        return convertHBSToAMD(fileContents, { moduleName: getModuleName(fileName, appName, projectRoot) });
      }

      resolve('');
    }).then((content) => resolve(content))
      .catch((error) => reject(error));
  });
}

function normalizeError(errorObject) {
  return Object.keys(errorObject).reduce((result, key) => {
    return Object.assign(result, { [key] : errorObject[key] });
  }, { message: errorObject.message, name: errorObject.name });
}

function getModuleName(fileName, applicationName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  return `${applicationName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

function importAddonToAMD(name, path, { applicationName, projectRoot }) {
  return new Promise((resolve, reject) => {
    Promise.all([
      importAddonFolderToAMD(name, `${path}/addon`, projectRoot),
      importAddonFolderToAMD(applicationName, `${path}/app`, projectRoot)
    ]).then((content) => resolve(content.join('\n')))
      .catch((error) => {
        console.log('error is', error);
        reject(error)
      });
  });
}
