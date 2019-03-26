import fs from 'fs-extra';
import { inspect } from 'util';
import chalk from 'ansi-colors';
import UglifyJS from 'uglify-es';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

// ENV, buildCache, applicationName, projectRoot
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
}, lint=true) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.js...');

    const applicationName = buildConfig.applicationName || 'frontend';
    const buildCache = buildConfig.buildCache || {
      vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
    };
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || { environment: 'development', modulePrefix: applicationName };
    const environment = ENV.environment || 'development';
    const outputPath = `${projectRoot}/tmp/assets/application.js`;
    const excludeTestFiles = (item) => !item.path.endsWith('-test.js');
    const timer = countTime();

    lookup(`${projectRoot}/src`, ['js', 'ts', 'hbs'], { filter: excludeTestFiles }).then((fileNames) => {
      return global.MBER_THREAD_POOL.submit({ action: 'TRANSPILE_JS', fileNames, applicationName, projectRoot });
    }).then((contents) => {
      const targetEnv = inspect(ENV, { depth: null });

      return writeApplicationJS(outputPath, environment, `
        ${buildCache.applicationPrepends || ''}
        define = window.define;
        ${contents.join('\n')}
        define('${applicationName}/config/environment', ['exports'], function (exports) {
          'use strict';

          exports.__esModule = true;

          if (window.location && (window.location.pathname === '/tests')) {
            var ENV = Object.assign(${targetEnv}, {
              locationType: 'none',
            });
            ENV.APP = Object.assign(ENV.APP, {
              autoboot: false,
              rootElement: '#ember-testing'
            });

            exports.default = ENV;
          } else {
            exports.default = ${targetEnv};
          }

          if (typeof FastBoot !== 'undefined') {
            return FastBoot.config("${applicationName}");
          }
        });

        if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['${applicationName}/src/main', '${applicationName}/config/environment'], function(App, config) {
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
          require('${applicationName}/src/main')['default'].create(require('${applicationName}/config/environment').default);
        }

        ${buildCache.applicationAppends || ''}
      `);
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_APPLICATION_JS_BUILD_ERROR) {
        say.stop();
        say.speak('application.js is now fixed. Well done');
        global.HAS_APPLICATION_JS_BUILD_ERROR = false;
      }

      fs.stat(outputPath).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} application.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        if (!lint) {
          return resolve({
            message: `BUILT: application.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
            stats: stats
          });
        }

        lookup(`${projectRoot}/src`, ['js'], { filter: excludeTestFiles }).then((fileNames) => {
          return global.MBER_THREAD_POOL.submit({ action: 'LINT_JS', fileNames, projectRoot });
        }).then(() => {
          resolve({
            message: `BUILT: application.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
            stats: stats
          });
        }).catch((error) => reject(error));
      });
    }).catch((error) => buildError(error, reject));
  });
}

function buildError(error, rejectPromise, fileName='') {
  global.HAS_APPLICATION_JS_BUILD_ERROR = true;
  say.stop();

  Console.error('application.js build error!');

  if (fileName.endsWith('.hbs')) {
    say.speak('Handlebars build fails. Check your code!');
  } else {
    say.speak('application.js build fails. Check your code!');
  }

  rejectPromise(error);
}

function writeApplicationJS(outputPath, environment, code) {
  if (['demo', 'production'].includes(environment)) {
    return fs.writeFile(outputPath, UglifyJS.minify(code, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
  }

  return fs.writeFile(outputPath, code);
}
