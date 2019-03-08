export default function(data) {
  return global.MBER_THREAD_POOL.submit(async (receivedData) => {
    require = require('esm')(module);

    const fs = require('fs-extra');
    const convertESModuletoAMD  = require(`${process.cwd()}/../lib/transpilers/convert-es-module-to-amd`).default;
    const convertHBSToAMD = require(`${process.cwd()}/../lib/transpilers/convert-hbs-to-amd`).default;

    // console.log('receivedData is');
    // console.log(receivedData);

    const { files, APPLICATION_NAME } = receivedData;

    const result = await Promise.all(files.map((file) => transpileFile(file, APPLICATION_NAME)))
      .catch((error) => {
        console.log('ERR is', error);
        throw new Error(error)
      });

    return result;

    function transpileFile(fileName, appName) {
      return new Promise((resolve, reject) => {
        return fs.readFile(fileName).then((fileContents) => {
          if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
            return resolve(convertESModuletoAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
          } else if (fileName.endsWith('.hbs')) {
            return resolve(convertHBSToAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
          }

          resolve('');
        }).catch((error) => {
          console.log('ERROR ON ', fileName);
          console.log(error);
          reject(error)
        });
      })
    }

    function getModuleName(fileName, appName) {
      const moduleName = fileName.split('src/')[1];

      return `${appName}/src/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
    }
  }, data);
}

