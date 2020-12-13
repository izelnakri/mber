import fs from 'fs/promises';
import chalk from 'ansi-colors';
import Console from '../utils/console.js';
import countTime from '../utils/count-time.js';
import findProjectRoot from '../utils/find-project-root.js';
import lookup from '../utils/recursive-file-lookup.js';
import say from '../utils/say.js';
import { formatTimePassed, formatSize } from '../utils/asset-reporter.js';

// const onlyTestFiles = (item) => item.path.endsWith('-test.js') || item.path.endsWith('-test.ts');

export default function(
  buildConfig = {
    applicationName: null,
    buildCache: {
      vendorAppends: '',
      vendorPrepends: '',
      applicationAppends: '',
      applicationPrepends: '',
      testPrepends: '',
      testAppends: ''
    },
    cliArguments: {},
    ENV: null,
    indexHTMLInjections: {},
    projectRoot: null
  },
  lint = true
) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'tests.js...');

    const ENV = buildConfig.ENV || {};
    const buildCache = buildConfig.buildCache || {};
    const applicationName = ENV.modulePrefix || 'frontend';
    const environment = ENV.environment || 'test';
    const projectRoot = buildConfig.projectRoot || (await findProjectRoot());
    const outputPath = `${projectRoot}/tmp/assets/tests.js`;
    const timer = countTime();

    Promise.all([
      lookup(`${projectRoot}/tests`, ['js', 'ts']),
      lookup(`${projectRoot}/src`, ['-test.js', '-test.ts'])
    ])
      .then(([testFolderFiles, appFolderTestFiles]) => {
        return global.MBER_THREAD_POOL.submit({
          action: 'TRANSPILE_JS',
          fileNames: testFolderFiles.concat(appFolderTestFiles),
          applicationName,
          projectRoot
        });
      })
      .then((contents) => {
        return fs.writeFile(
          outputPath,
          `define = window.define; ${buildCache.testPrepends || ''}
          ${contents.join('\n')}
          window.require('${applicationName}/tests/test-helper');
          EmberENV.TESTS_FILE_LOADED = true;
          ${buildCache.testAppends || ''}`
        );
      })
      .then(() => {
        const timePassed = timer.stop();

        if (global.HAS_TESTS_JS_BUILD_ERROR) {
          say.stop();
          say.speak('tests.js build is now fixed. Well done');
          global.HAS_TESTS_JS_BUILD_ERROR = false;
        }

        fs.stat(outputPath).then((stats) => {
          Console.log(
            `${chalk.green('BUILT:')} tests.js in ${formatTimePassed(timePassed)} [${formatSize(
              stats.size
            )}] Environment: ${environment}`
          );

          if (!lint) {
            return resolve({
              message: `BUILT: tests.js in ${timePassed}ms [${formatSize(
                stats.size
              )}] Environment: ${environment}`,
              stats: stats
            });
          }

          Promise.all([
            lookup(`${projectRoot}/tests`, ['js', 'ts']),
            lookup(`${projectRoot}/src`, ['-test.js', '-test.ts'])
          ])
            .then(([testFolderFiles, appFolderTestFiles]) => {
              return global.MBER_THREAD_POOL.submit({
                action: 'LINT_JS',
                fileNames: testFolderFiles.concat(appFolderTestFiles),
                projectRoot
              });
            })
            .then(() => {
              resolve({
                message: `BUILT: tests.js in ${timePassed}ms [${formatSize(
                  stats.size
                )}] Environment: ${environment}`,
                stats: stats
              });
            })
            .catch((error) => reject(error));
        });
      })
      .catch((error) => buildError(error, reject));
  });
}

function buildError(error, rejectPromise) {
  global.HAS_TESTS_JS_BUILD_ERROR = true;
  say.stop();
  say.speak('tests.js build fails. Check your code!');

  Console.error('tests.js build error!');
  rejectPromise(error);
}
