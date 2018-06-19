import fs from 'fs';
import { promisify } from 'util';
import convertESModuletoAMD from './convert-es-module-to-amd';
import convertHBSToAMD from './convert-hbs-to-amd';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default function(moduleName, addonPath) {
  const projectRoot = findProjectRoot();
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;
  const packagePath = fs.existsSync(mberPackage) ?
    mberPackage : getModulePath(addonPath, projectRoot);

  return new Promise((resolve) => { // NOTE: test this func async
    let targetFiles = [];

    lookup(packagePath, ['js', 'hbs']).then((files) => {
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

  if (fileAbsolutePath.endsWith('.js')) {
    const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;

    return convertESModuletoAMD(code, { moduleName: finalModuleName });
  }

  const finalModuleName = `${libraryName}${moduleName.slice(0, -4)}`;

  return convertHBSToAMD(code, { moduleName: finalModuleName });
}

function getModulePath(path, projectRoot) {
  return path.startsWith(projectRoot) ? path : `${projectRoot}/node_modules/${path}`;
}
