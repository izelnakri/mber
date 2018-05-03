import fs from 'fs';
import { promisify } from 'util';
import RSVP from 'rsvp';
import convertESModuletoAMD from './convert-es-module-to-amd';
import lookup from './recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default function(moduleName, addonPath) {
  return new Promise((resolve) => {
    lookup(`./node_modules/${addonPath}`, { depthLimit: -1 }).then((files) => {
      return RSVP.hash(files.reduce((result, fileName) => {
        return Object.assign(result, { [fileName]: readFileAsync(fileName) });
      }, {}));
    }).then((contents) => {
      const transformedFiles = Object.keys(contents)
        .map((filePath) => convertFile(contents[filePath], moduleName, filePath, addonPath));

      return resolve(transformedFiles.join('\n'));
    });
  });
}

function convertFile(code, libraryName, fileAbsolutePath, moduleEntryPoint='ember-data/addon') {
  const startIndex = fileAbsolutePath.indexOf(moduleEntryPoint);
  const moduleName = fileAbsolutePath.slice(startIndex + moduleEntryPoint.length);
  const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;
  const libraryPath = fileAbsolutePath.slice(0, fileAbsolutePath.lastIndexOf(moduleEntryPoint) + moduleEntryPoint.length);

  return convertESModuletoAMD(code, {
    moduleName: finalModuleName,
    libraryPath: libraryPath,
    fileAbsolutePath: fileAbsolutePath
  });
}
