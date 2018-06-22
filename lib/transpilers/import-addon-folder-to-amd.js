import fs from 'fs-extra';
import { promisify } from 'util';
import convertESModuletoAMD from './convert-es-module-to-amd';
import convertHBSToAMD from './convert-hbs-to-amd';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);
const existsAsync = promisify(fs.pathExists);

export default function(moduleName, addonPath) {
  const projectRoot = findProjectRoot();
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;

  return new Promise(async (resolve) => {
    const isMberPackage = await existsAsync(mberPackage);
    const packagePath = isMberPackage ? mberPackage : await getModulePath(addonPath, projectRoot);

    if (!packagePath) {
      return resolve('');
    }

    let targetFiles = [];

    existsAsync(packagePath).then()
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

async function getModulePath(path, projectRoot) {
  const targetPath = path.startsWith(projectRoot) ? path : `${projectRoot}/node_modules/${path}`;
  const pathExists = await existsAsync(targetPath);

  return pathExists ? targetPath : null;
}
