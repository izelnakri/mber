import fs from 'fs-extra';
import { minify } from 'terser';
import chalk from 'ansi-colors';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import countTime from '../utils/count-time.js';
import lookup from '../utils/recursive-file-lookup.js';
import say from '../utils/say.js';
import convertHBSToAMD from '../transpilers/convert-hbs-to-amd.js';
import { formatTimePassed, formatSize } from '../utils/asset-reporter.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function (
  buildConfig = {
    applicationName: null,
    buildCache: {
      vendorAppends: '',
      vendorPrepends: '',
      applicationAppends: '',
      applicationPrepends: '',
    },
    cliArguments: {},
    ENV: {},
    indexHTMLInjections: {},
    projectRoot: null,
  },
  lint = true
) {
  return new Promise(async (resolve, reject) => {
    const ENV = buildConfig.ENV || {
      environment: 'development',
      modulePrefix: buildConfig.applicationName || 'frontend',
    };
    const environment = ENV.environment || 'development';
    const applicationName = ENV.modulePrefix;
    const projectRoot = buildConfig.projectRoot || (await findProjectRoot());
    const outputPath = `${projectRoot}/tmp/assets/documentation.js`;
    const timer = countTime();

    Promise.all([
      importDocumentationCode(applicationName),
      lookup(`${projectRoot}/documentation`, ['js', 'ts', 'hbs']),
      fs.readFile(`${__dirname}/../addons/mber-documentation/vendor/highlight.pack.js`),
      fs.readFile(`${__dirname}/../addons/mber-documentation/vendor/copee.umd.js`),
    ])
      .then(([addonCode, files, highlighLibrary, copeeLibrary]) => {
        return Promise.all(
          [addonCode, highlighLibrary, copeeLibrary].concat(
            files.map((file) => transpileToES5(file, applicationName, reject))
          )
        );
      })
      .then((allReadFiles) => {
        return writeDocumentationJS(
          outputPath,
          environment,
          `
        define = window.define;
        ${allReadFiles.join('\n')}
      `
        );
      })
      .then(() => {
        const timePassed = timer.stop();

        if (global.HAS_DOCUMENTATION_JS_BUILD_ERROR) {
          say.stop();
          say.speak('documentation.js is now fixed. Well done');
          global.HAS_DOCUMENTATION_JS_BUILD_ERROR = false;
        }

        fs.stat(outputPath).then((stats) => {
          Console.log(
            `${chalk.green('BUILT:')} documentation.js in ${formatTimePassed(
              timePassed
            )} [${formatSize(stats.size)}] Environment: ${environment}`
          );

          if (!lint) {
            return resolve({
              message: `BUILT: documentation.js in ${timePassed}ms [${formatSize(
                stats.size
              )}] Environment: ${environment}`,
              stats: stats,
            });
          }

          lookup(`${projectRoot}/documentation`, ['js', 'ts'])
            .then((fileNames) => {
              return global.MBER_THREAD_POOL.submit({ action: 'LINT_JS', fileNames, projectRoot });
            })
            .then(() => {
              resolve({
                message: `BUILT: documentation.js in ${timePassed}ms [${formatSize(
                  stats.size
                )}] Environment: ${environment}`,
                stats: stats,
              });
            })
            .catch((error) => reject(error));
        });
      })
      .catch((error) => buildError(error, reject));
  });
}

function importDocumentationCode(applicationName) {
  return new Promise((resolve) => {
    let targetFiles = [];

    lookup(`${__dirname}/../addons/mber-documentation/src`, ['hbs', 'ts', 'js'])
      .then((files) => {
        targetFiles = files;

        return Promise.all(files.map((fileName) => fs.readFile(fileName)));
      })
      .then(async (contents) => {
        const conversionPromises = contents.map((content, index) =>
          convertFile(content, applicationName, targetFiles[index])
        );
        const transformedFiles = await Promise.all(conversionPromises);

        return resolve(transformedFiles.join('\n'));
      })
      .catch((error) => {
        console.log(error);
        console.log(`importDocumentationCode error: ${error}`);
      });
  });
}

function convertFile(code, applicationName, fileAbsolutePath) {
  const startIndex = fileAbsolutePath.indexOf(`mber-documentation`);
  const moduleName = fileAbsolutePath.slice(startIndex + 'mber-documentation'.length);

  if (fileAbsolutePath.endsWith('.js')) {
    const finalModuleName = `${applicationName}${moduleName.slice(0, -3)}`;

    return convertESModuletoAMD(code, { moduleName: finalModuleName });
  }

  const finalModuleName = `${applicationName}${moduleName.slice(0, -4)}`;

  return convertHBSToAMD(code, { moduleName: finalModuleName });
}

function transpileToES5(fileName, appName, rejectPromise) {
  return new Promise((resolve) => {
    return fs
      .readFile(fileName)
      .then((fileContents) => {
        if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
          return resolve(
            convertESModuletoAMD(fileContents, { moduleName: getModuleName(fileName, appName) })
          );
        } else if (fileName.endsWith('.hbs')) {
          return resolve(
            convertHBSToAMD(fileContents, { moduleName: getModuleName(fileName, appName) })
          );
        }

        resolve('');
      })
      .catch((error) => buildError(error, rejectPromise, fileName));
  });
}

function getModuleName(fileName, appName) {
  const moduleName = fileName.split('documentation/')[1];
  const moduleAbsolutePath = `${appName}/src/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
  const modulePath = transpileDocumentationApp(moduleAbsolutePath); // TODO: maybe take this to smt else

  return modulePath;
}

function transpileDocumentationApp(moduleAbsolutePath) {
  if (moduleAbsolutePath.includes('/src/ui/routes')) {
    return moduleAbsolutePath.replace('ui/routes', 'ui/routes/documentation');
  } else if (moduleAbsolutePath.includes('/src/router')) {
    return moduleAbsolutePath.replace('/src/router', '/documentation/src/router');
  }

  return moduleAbsolutePath;
}

function buildError(error, rejectPromise, fileName = '') {
  global.HAS_DOCUMENTATION_JS_BUILD_ERROR = true;
  say.stop();
  console.log('error is');
  console.log(error);

  if (fileName.endsWith('.hbs')) {
    say.speak('Handlebars build fails. Check your code!');

    Console.error('documentation.js build error:');
  } else {
    say.speak('documentation.js build fails. Check your code!');

    Console.error('documentation.js build error:');
  }

  console.log(error);
  rejectPromise(error);
}

async function writeDocumentationJS(outputPath, environment, code) {
  if (['demo', 'production'].includes(environment)) {
    return await fs.writeFile(
      outputPath,
      (
        await minify(code, {
          compress: {
            negate_iife: false,
            sequences: 20,
          },
          output: {
            semicolons: false,
          },
        })
      ).code
    );
  }

  return await fs.writeFile(outputPath, code);
}
