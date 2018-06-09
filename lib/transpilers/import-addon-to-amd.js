import fs from 'fs';
import { promisify } from 'util';
import convertESModuletoAMD from './convert-es-module-to-amd';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default function(moduleName, addonPath) {
  const projectRoot = findProjectRoot();
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;
  const packagePath = fs.existsSync(mberPackage) ? mberPackage : `${projectRoot}/node_modules/${addonPath}`;

  return new Promise((resolve) => { // NOTE: test this func async
    let targetFiles = [];

    lookup(packagePath, 'js').then((files) => {
      targetFiles = files;

      return Promise.all(files.map((fileName => readFileAsync(fileName))));
    }).then((contents) => {
      const transformedFiles = contents
        .map((content, index) => convertFile(content, moduleName, targetFiles[index], addonPath));

      return resolve(transformedFiles.join('\n'));
    }).catch((error) => console.log(`importAddonToAMD error: ${error}`));
  });
}

function convertFile(code, libraryName, fileAbsolutePath, moduleEntryPoint='ember-data/addon') {
  const startIndex = fileAbsolutePath.indexOf(moduleEntryPoint);
  const moduleName = fileAbsolutePath.slice(startIndex + moduleEntryPoint.length);
  const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;

  return convertESModuletoAMD(code, { moduleName: finalModuleName });
}
