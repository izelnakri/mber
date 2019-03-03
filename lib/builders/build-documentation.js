import fs from 'fs-extra';
import UglifyJS from 'uglify-es';
import chalk from 'ansi-colors';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import countTime from '../utils/count-time';
import lintJavaScript from '../utils/lint-javascript';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

global.mainContext = global;

const convertHBSToAMD = require('../transpilers/convert-hbs-to-amd').default;

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: {},
  ENV: {},
  indexHTMLInjections: {},
  projectRoot: null,
}) {
  return new Promise(async (resolve, reject) => {
    const ENV = buildConfig.ENV || {
      environment: 'development', modulePrefix: buildConfig.applicationName || 'frontend'
    };
    const ENVIRONMENT = ENV.environment || 'development';
    const APPLICATION_NAME = ENV.modulePrefix;
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/documentation.js`;
    const timer = countTime();

    Promise.all([
      importDocumentationCode(APPLICATION_NAME),
      lookup(`${PROJECT_ROOT}/documentation`, ['js', 'hbs'])
    ]).then(([addonCode, files]) => {
      return Promise.all([
        addonCode,
        fs.readFile(`${__dirname}/../addons/mber-documentation/vendor/highlight.pack.js`),
        fs.readFile(`${__dirname}/../addons/mber-documentation/vendor/copee.umd.js`)
      ].concat(files.map((file) => transpileFile(file, APPLICATION_NAME, reject))));
    }).then((allReadFiles) => {
      return writeDocumentationJS(OUTPUT_PATH, ENVIRONMENT, `
        define = window.define;
        ${allReadFiles.join('\n')}
      `);
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_DOCUMENTATION_JS_BUILD_ERROR) {
        say.stop();
        say.speak('documentation.js is now fixed. Well done');
        global.HAS_DOCUMENTATION_JS_BUILD_ERROR = false;
      }

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} documentation.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${ENVIRONMENT}`);

        resolve({
          message: `BUILT: documentation.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${ENVIRONMENT}`,
          stats: stats
        });

        lookup(`${PROJECT_ROOT}/documentation`, ['js']).then((files) => lintJavaScript(files, buildConfig));
      });
    }).catch((error) => buildError(error, reject));
  });
}

function importDocumentationCode(applicationName) {
  return new Promise((resolve) => {
    let targetFiles = [];

    lookup(`${__dirname}/../addons/mber-documentation/src`, ['hbs', 'js']).then((files) => {
      targetFiles = files;

      return Promise.all(files.map((fileName => fs.readFile(fileName))));
    }).then(async (contents) => {
      const conversionPromises = contents
        .map((content, index) => convertFile(content, applicationName, targetFiles[index]));
      const transformedFiles = await Promise.all(conversionPromises);

      return resolve(transformedFiles.join('\n'));
    }).catch((error) => {
      console.log(error);
      console.log(`importDocumentationCode error: ${error}`)
    });
  })
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


function transpileFile(fileName, appName, rejectPromise) {
  return new Promise((resolve) => {
    return fs.readFile(fileName).then((fileContents) => {
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        return resolve(convertESModuletoAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
      } else if (fileName.endsWith('.hbs')) {
        return resolve(convertHBSToAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
      }

      resolve('');
    }).catch((error) => buildError(error, rejectPromise, fileName));
  })
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

function buildError(error, rejectPromise, fileName='') {
  global.HAS_DOCUMENTATION_JS_BUILD_ERROR = true;
  say.stop();
  console.log('error is');
  console.log(error);

  if (fileName.endsWith('.hbs')) {
    say.speak('Handlebars build fails. Check your code!');

    Console.error('application.js build error:');
  } else {
    say.speak('documentation.js build fails. Check your code!');

    Console.error('application.js build error:');
  }

  console.log(error);
  rejectPromise(error);
}

function writeDocumentationJS(OUTPUT_PATH, environment, code) {
  if (['demo', 'production'].includes(environment)) {
    return fs.writeFile(OUTPUT_PATH, UglifyJS.minify(code, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
  }

  return fs.writeFile(OUTPUT_PATH, code);
}
