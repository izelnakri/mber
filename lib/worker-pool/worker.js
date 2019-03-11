require = require('esm')(module); // eslint-disable-line

const { parentPort, threadId } = require('worker_threads');
const fs = require('fs-extra');
const convertESModuletoAMD  = require(`${process.cwd()}/../lib/transpilers/convert-es-module-to-amd`).default;
const convertHBSToAMD = require(`${process.cwd()}/../lib/transpilers/convert-hbs-to-amd`).default;

console.log('[WORKER #', threadId, '] started');

parentPort.on('message', async ({ files, APPLICATION_NAME, projectRoot }) => {
  console.log('[WORKER #', threadId, '] working');
  const result = await Promise.all(files.map((file) => transpileFile(file, APPLICATION_NAME, projectRoot)))
    .catch((error) => {
      console.log('ERR is', error);
      throw new Error(error)
    });

  return parentPort.postMessage(result);
});

parentPort.on('close', () => console.log('[Worker] parentPort closed!'));

function transpileFile(fileName, appName, projectRoot) {
  return new Promise((resolve, reject) => {
    return fs.readFile(fileName).then((fileContents) => {
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        return resolve(convertESModuletoAMD(fileContents, { moduleName: getModuleName(fileName, appName, projectRoot) }));
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

function getModuleName(fileName, appName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  return `${appName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

// function transpileFile(fileName, appName, projectRoot, rejectPromise) {
//   return new Promise((resolve) => {
//     return fs.readFile(fileName).then((fileContents) => {
//       return resolve(convertESModuletoAMD(fileContents, {
//         moduleName: getModuleName(fileName, appName, projectRoot)
//       }));
//     }).catch((error) => buildError(error, rejectPromise));
//   });
// }

// function getModuleName(fileName, appName, projectRoot) {
//   const moduleName = fileName.split(projectRoot + '/')[1];

//   return `${appName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
// }
