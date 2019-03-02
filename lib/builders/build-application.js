import fs from 'fs-extra';
import { inspect } from 'util';
import chalk from 'ansi-colors';
import UglifyJS from 'uglify-es';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import lintJavaScript from '../utils/lint-javascript';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

global.mainContext = global;

const convertHBSToAMD = require('../transpilers/convert-hbs-to-amd').default;

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: '',
    testPrepends: '', testAppends: ''
  },
  cliArguments: {},
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null
}) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.js...');

    const APPLICATION_NAME = buildConfig.applicationName || 'frontend';
    const BUILD_CACHE = buildConfig.buildCache || {
      vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
    };
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || { environment: 'development', modulePrefix: APPLICATION_NAME };
    const ENVIRONMENT = ENV.environment || 'development';
    const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.js`;
    const excludeTestFiles = (item) => !item.path.endsWith('-test.js');
    const timer = countTime();

    lookup(`${PROJECT_ROOT}/src`, ['js', 'hbs'], { filter: excludeTestFiles }).then((files) => {
      return Promise.all(files.map((file) => transpileFile(file, APPLICATION_NAME, reject)));
    }).then((contents) => {
      const TARGET_ENV = inspect(ENV, { depth: null });

      return writeApplicationJS(OUTPUT_PATH, ENVIRONMENT, `
        ${BUILD_CACHE.applicationPrepends || ''}
        define = window.define;
        ${contents.join('\n')}
        define('${APPLICATION_NAME}/config/environment', ['exports'], function (exports) {
          'use strict';

          exports.__esModule = true;

          if (window.location && (window.location.pathname === '/tests')) {
            var ENV = Object.assign(${TARGET_ENV}, {
              locationType: 'none',
            });
            ENV.APP = Object.assign(ENV.APP, {
              autoboot: false,
              rootElement: '#ember-testing'
            });

            exports.default = ENV;
          } else {
            exports.default = ${TARGET_ENV};
          }

          if (typeof FastBoot !== 'undefined') {
            return FastBoot.config("${APPLICATION_NAME}");
          }
        });

        if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['${APPLICATION_NAME}/src/main', '${APPLICATION_NAME}/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('${APPLICATION_NAME}/src/main')['default'].create(require('${APPLICATION_NAME}/config/environment').default);
        }

        ${BUILD_CACHE.applicationAppends || ''}
      `);
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_APPLICATION_JS_BUILD_ERROR) {
        say.stop();
        say.speak('application.js is now fixed. Well done');
        global.HAS_APPLICATION_JS_BUILD_ERROR = false;
      }

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} application.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${ENVIRONMENT}`);

        resolve({
          message: `BUILT: application.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${ENVIRONMENT}`,
          stats: stats
        });

        lookup(`${PROJECT_ROOT}/src`, ['js'], { filter: excludeTestFiles })
          .then((files) => lintJavaScript(files, buildConfig));
      });
    }).catch((error) => buildError(error, reject));
  });
}

function buildError(error, rejectPromise, fileName='') {
  global.HAS_APPLICATION_JS_BUILD_ERROR = true;
  say.stop();

  if (fileName.endsWith('.hbs')) {
    say.speak('Handlebars build fails. Check your code!');

    Console.error('application.js build error:');
  } else {
    say.speak('application.js build fails. Check your code!');

    Console.error('application.js build error:');
  }

  console.log(error);
  rejectPromise(error);
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
  const moduleName = fileName.split('src/')[1];

  return `${appName}/src/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

function writeApplicationJS(OUTPUT_PATH, environment, code) {
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
