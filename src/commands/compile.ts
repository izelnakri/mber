import fs from 'fs-extra';
import Console from '../utils/console.js';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd.js';
import convertHBSToAMD from '../transpilers/convert-hbs-to-amd.js';
import findProjectRoot from '../utils/find-project-root.js';

export default async function() {
  return new Promise(async (resolve, reject) => {
    const fileOrFolder = process.argv[3];

    return fs
      .stat(fileOrFolder)
      .then(async (dirEntry) => {
        const projectRoot = await findProjectRoot();
        const applicationName = await getApplicationName(projectRoot);

        if (dirEntry.isDirectory()) {
          if (fileOrFolder.includes('node_modules')) {
            lookup(fileOrFolder, ['js', 'ts']).forEach((file) =>
              transpileJS(file, applicationName, { projectRoot })
            );
            lookup(fileOrFolder, ['hbs']).forEach((file) =>
              transpileHBS(file, applicationName, { projectRoot })
            );

            return console.log('should adjust transpilation for ember-addon');
          }

          lookup(fileOrFolder, ['js', 'ts']).forEach((file) =>
            transpileJS(file, applicationName, { projectRoot })
          );

          return lookup(fileOrFolder, ['hbs']).forEach((file) =>
            transpileHBS(file, applicationName, { projectRoot })
          );
        } else if (fileOrFolder.endsWith('.hbs')) {
          const HTMLBarsCompiler = await importEmberTemplateCompiler();
          const moduleModeEnabled = !!process.argv
            .slice(3)
            .find((arg) => arg.startsWith('--module'));
          const transpile = moduleModeEnabled ? convertHBSToAMD : HTMLBarsCompiler.precompile;

          return transpileHBS(fileOrFolder, applicationName, { projectRoot, transpile });
        } else if (fileOrFolder.endsWith('.js') || fileOrFolder.endsWith('.ts')) {
          return transpileJS(fileOrFolder, applicationName, { projectRoot });
        }

        console.log(`unrecognized file extension for ${fileOrFolder}. Use .js, .ts or .hbs`);

        process.exit(1);
      })
      .catch((error) => {
        console.log(error);
        // should try ember-cli-fastboot etc here
        console.log(`${fileOrFolder} does not exist. Please use a correct path to compile`);

        process.exit(1);
      });
  });
}

async function getApplicationName(projectRoot) {
  const environmentPath = `${projectRoot}/config/environment.js`;

  if (!(await fs.exists(environmentPath))) {
    return 'frontend';
  }

  const ENV = (await import(`${projectRoot}/config/environment.js`)).default('development');

  return ENV.modulePrefix;
}

async function transpileJS(file, applicationName, project = { projectRoot: '' }) {
  const moduleName = getModuleName(file, applicationName, project.projectRoot);
  const content = await fs.readFile(file);

  return console.log(await convertESModuletoAMD(content.toString(), { moduleName }));
}

async function transpileHBS(file, applicationName, project = { projectRoot: '', transpile: {} }) {
  const moduleName = getModuleName(file, applicationName, project.projectRoot);
  const content = await fs.readFile(file);

  return console.log(await project.transpile(content.toString(), { moduleName }));
}

function getModuleName(fileName, applicationName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1] || fileName;

  return `${applicationName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

async function importEmberTemplateCompiler() {
  const { createRequire } = await import('module');
  const { fileURLToPath } = await import('url');
  const requireModule = global.require ? require : createRequire(fileURLToPath(import.meta.url));

  return requireModule('../../vendor/ember-template-compiler');
}
