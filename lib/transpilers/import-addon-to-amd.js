import fs from 'fs';
import { promisify } from 'util';
import RSVP from 'rsvp';
import convertESModuletoAMD from './convert-es-module-to-amd';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default async function(moduleName, addonPath) {
  const projectRoot = findProjectRoot();
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;
  const packagePath = await fs.exists(mberPackage) ? mberPackage : `${projectRoot}/node_modules/${addonPath}`;

  return new Promise((resolve) => {
    lookup(packagePath, 'js').then((files) => {
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

  return convertESModuletoAMD(code, { moduleName: finalModuleName });
}
