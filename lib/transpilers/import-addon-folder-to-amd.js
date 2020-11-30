// TODO: this module should be tested and optimized
import fs from 'fs-extra';
import convertESModuletoAMD from './convert-es-module-to-amd.js';
import convertHBSToAMD from './convert-hbs-to-amd.js';
import findProjectRoot from '../utils/find-project-root.js';
import lookup from '../utils/recursive-file-lookup.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function(moduleName, addonPath, projectRoot, lookupOptions) {
  return new Promise(async (resolve, reject) => {
    const PROJECT_ROOT = projectRoot || (await findProjectRoot());
    const packagePath = await getAddonPath(addonPath, PROJECT_ROOT);

    if (!packagePath) {
      return resolve('');
    }

    let targetFiles = [];

    lookup(packagePath, ['hbs', 'js', 'ts'], lookupOptions)
      .then((files) => {
        targetFiles = filterTSIFNeeded(files);

        return Promise.all(targetFiles.map((fileName) => fs.readFile(fileName)));
      })
      .then(async (contents) => {
        const convertions = contents.map((content, index) =>
          convertFile(content, moduleName, targetFiles[index], addonPath)
        );
        const transformedFiles = await Promise.all(convertions);

        return resolve(transformedFiles.join('\n'));
      })
      .catch((error) => {
        console.log(error);
        console.log(`importAddonFolderToAMD error: ${error}`);
        reject(error);
      });
  });
}

async function getAddonPath(addonPath, projectRoot) {
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;

  if (await fs.pathExists(mberPackage)) {
    return mberPackage;
  }

  const targetPath = addonPath.startsWith(projectRoot)
    ? addonPath
    : `${projectRoot}/node_modules/${addonPath}`;

  if (await fs.pathExists(targetPath)) {
    return targetPath;
  } else if (await fs.pathExists(addonPath)) {
    return addonPath;
  }

  return null;
}

function convertFile(code, libraryName, fileAbsolutePath, moduleEntryPoint = 'ember-data/addon') {
  const startIndex = fileAbsolutePath.indexOf(moduleEntryPoint);
  const moduleName = fileAbsolutePath.slice(startIndex + moduleEntryPoint.length);

  if (fileAbsolutePath.endsWith('.js') || fileAbsolutePath.endsWith('.ts')) {
    const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;

    return convertESModuletoAMD(code, { moduleName: finalModuleName, emberDataRelated: true });
  }

  const finalModuleName = `${libraryName}${moduleName.slice(0, -4)}`;

  return convertHBSToAMD(code, { moduleName: finalModuleName });
}

function filterTSIFNeeded(filePaths) {
  let temporaryObject = filePaths.reduce((result, filePath) => {
    if (filePath.endsWith('.hbs')) {
      result[filePath] = filePath;

      return result;
    }

    let [path, extension] = filePath.endsWith('.ts') ? filePath.split('.ts') : filePath.split('.js');

    if (extension === '.js' || !result[path]) {
      result[path] = filePath;
    }

    return result;
  }, {});

  return Object.keys(temporaryObject).map((objectKey) => temporaryObject[objectKey]);
}
