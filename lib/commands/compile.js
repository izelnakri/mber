import fs from 'fs-extra';
import Console from '../utils/console.js';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd.js';
import convertHBSToAMD from '../transpilers/convert-hbs-to-amd.js';

export default async function() {
  return new Promise(async (resolve, reject) => {
    const fileOrFolder = process.argv[3];

    // TODO: include --module flag for handlebars
    return fs
      .stat(fileOrFolder)
      .then(async (dirEntry) => {
        if (dirEntry.isDirectory()) {
          if (fileOrFolder.includes('node_modules')) {
            return console.log('should be an ember-addon');
          }

          return console.log('should transpile folder');
        } else if (fileOrFolder.endsWith('.hbs')) {
          const HTMLBarsCompiler = await importEmberTemplateCompiler();
          const content = await fs.readFile(fileOrFolder);
          const moduleName = 'something';

          return console.log(
            await HTMLBarsCompiler.precompile(content.toString(), { moduleName: moduleName })
          );
        } else if (fileOrFolder.endsWith('.js') || fileOrFolder.endsWith('.ts')) {
          const content = await fs.readFile(fileOrFolder);
          // const moduleName =

          return console.log(await convertHBSToAMD(content, { moduleName: 'something' }));
        }

        console.log(`unrecognized file extension for ${fileOrFolder}. Use .js, .ts or .hbs`);

        process.exit(1);
      })
      .catch((error) => {
        console.log(`${fileOrFolder} does not exist. Please use a correct path to compile`);

        process.exit(1);
      });
  });
}

function getModuleName(fileName, applicationName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  return `${applicationName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

async function importEmberTemplateCompiler() {
  const { createRequire } = await import('module');
  const { fileURLToPath } = await import('url');
  const requireModule = global.require ? require : createRequire(fileURLToPath(import.meta.url));

  return requireModule('../../vendor/ember-template-compiler');
}
