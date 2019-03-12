require = require('esm')(module); // eslint-disable-line

const CWD = `${process.cwd()}`;

const { promisify } = require('util');
const { parentPort, threadId } = require('worker_threads');
const fs = require('fs-extra');
const sass = require('node-sass');
const Console = require(`${CWD}/../lib/utils/console`);
const convertESModuletoAMD  = require(`${CWD}/../lib/transpilers/convert-es-module-to-amd`).default;
const convertHBSToAMD = require(`${CWD}/../lib/transpilers/convert-hbs-to-amd`).default;
const lintJavaScript  = require('../utils/lint-javascript').default;

const compileScssAsync = promisify(sass.render);
const workerReference = `[WORKER #${threadId}]`;

Console.log(`${workerReference} started`);

parentPort.on('error', (error) => Console.error(`${workerReference} error received`, error));
parentPort.on('exit', () => Console.log(`${workerReference} parentPort closed!`));
parentPort.on('online', () => Console.log(`${workerReference} running`));
parentPort.on('message', ({ action, fileNames, applicationName, projectRoot, buildConfig, ENVIRONMENT }) => {
  return new Promise((resolve, reject) => {
    if (action === 'TRANSPILE_JS') {
      Console.log(`${workerReference} transpiling JS/TS`);

      Promise.all(fileNames.map((fileName) => transpileToES5(fileName, applicationName, projectRoot)))
        .then((result) => resolve(parentPort.postMessage(result)))
        .catch((error) => reject(error));
    } else if (action === 'LINT_JS') {
      Console.log(`${workerReference} linting JS/TS`);

			resolve(lintJavaScript(fileNames, buildConfig));
    } else if (action === 'TRANSPILE_SCSS') {
      Console.log(`${workerReference} transpiling SCSS`);

      Promise.all([`${projectRoot}/src/ui/styles/application.scss`].concat(fileNames).map((scssFile) => fs.readFile(scssFile)))
        .then((scssContent) => compileScssAsync({
          data: scssContent.join('\n'),
          outputStyle: ['production', 'demo'].includes(ENVIRONMENT) ? 'compressed' : 'expanded',
          sourceMap: true,
          includePaths: [`${projectRoot}/src/ui/styles`]
        }))
        .then((result) => resolve(parentPort.postMessage(result.css.toString())))
        .catch((error) => reject(error));
    } else if (action === 'BUNDLE_ADDON') {
      // something
    }
  });
  // TODO: CSS + LINT, addon bundle
});

function transpileToES5(fileName, appName, projectRoot) {
  return new Promise((resolve, reject) => {
    return fs.readFile(fileName).then((fileContents) => {
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        return resolve(convertESModuletoAMD(fileContents, {
          moduleName: getModuleName(fileName, appName, projectRoot)
        }));
      } else if (fileName.endsWith('.hbs')) {
        return resolve(convertHBSToAMD(fileContents, { moduleName: getModuleName(fileName, appName, projectRoot) }));
      }

      resolve('');
    }).catch((error) => {
      console.log('ERROR ON ', fileName);
      console.log(error);
      reject(error)
    });
  })
}

function getModuleName(fileName, applicationName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  return `${applicationName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}
