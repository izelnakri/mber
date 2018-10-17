// TODO: this module should be tested and optimized
import fs from 'fs-extra';
import convertESModuletoAMD from './convert-es-module-to-amd';
import convertHBSToAMD from './convert-hbs-to-amd';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';

export default function(moduleName, addonPath, projectRoot, options) {
  return new Promise(async (resolve) => {
    const PROJECT_ROOT = projectRoot || await findProjectRoot();
    const packagePath = await getAddonPath(addonPath, PROJECT_ROOT);

    if (!packagePath) {
      return resolve('');
    }

    let targetFiles = [];

    lookup(packagePath, ['js', 'hbs'], options).then((files) => {
      targetFiles = files;

      return Promise.all(files.map((fileName => fs.readFile(fileName))));
    }).then((contents) => {
      const transformedFiles = contents
        .map((content, index) => convertFile(content, moduleName, targetFiles[index], addonPath));

      return resolve(transformedFiles.join('\n'));
    }).catch((error) => {
      console.log(error);
      console.log(`importAddonFolderToAMD error: ${error}`)
    });
  });
}

async function getAddonPath(addonPath, projectRoot) {
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;

  if (await fs.pathExists(mberPackage)) {
    return mberPackage;
  }

  const targetPath = addonPath.startsWith(projectRoot) ?
    addonPath : `${projectRoot}/node_modules/${addonPath}`;

  if (await fs.pathExists(targetPath)) {
    return targetPath;
  } else if (await fs.pathExists(addonPath)) {
    return addonPath;
  }

  return null;
}

function convertFile(code, libraryName, fileAbsolutePath, moduleEntryPoint='ember-data/addon') {
  const startIndex = fileAbsolutePath.indexOf(moduleEntryPoint);
  const moduleName = fileAbsolutePath.slice(startIndex + moduleEntryPoint.length);

  if (fileAbsolutePath.endsWith('.js')) {
    const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;

    // console.log('finalModuleName');
    return convertESModuletoAMD(code, { moduleName: finalModuleName });
  }

  const finalModuleName = `${libraryName}${moduleName.slice(0, -4)}`;

  return convertHBSToAMD(code, { moduleName: finalModuleName });
}
