import fs from 'fs-extra';
import chalk from 'ansi-colors';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lintJavaScript from '../utils/lint-javascript';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const onlyTestFiles = (item) => item.path.endsWith('-test.js');

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
    Console.log(chalk.yellow('BUILDING:'), 'tests.js...');

    const ENV = buildConfig.ENV || {};
    const BUILD_CACHE = buildConfig.buildCache || {};
    const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
    const environment = ENV.environment || 'test';
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/tests.js`;
    const timer = countTime();

    Promise.all([
      lookup(`${PROJECT_ROOT}/tests`, ['js']),
      lookup(`${PROJECT_ROOT}/src`, ['-test.js'], { filter: onlyTestFiles })
    ]).then(([testFolderFiles, appFolderTestFiles]) => {
      return Promise.all(testFolderFiles.concat(appFolderTestFiles).map((file) => {
        return transpileFile(file, APPLICATION_NAME, PROJECT_ROOT, reject);
      }));
    }).then((contents) => {
      return fs.writeFile(
        OUTPUT_PATH,
        `define = window.define; ${BUILD_CACHE.testPrepends || ''}
          ${contents.join('\n')}
          window.require('${APPLICATION_NAME}/tests/test-helper');
          EmberENV.TESTS_FILE_LOADED = true;
          ${BUILD_CACHE.testAppends || ''}`
      );
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_TESTS_JS_BUILD_ERROR) {
        say.stop();
        say.speak('tests.js build is now fixed. Well done');
        global.HAS_TESTS_JS_BUILD_ERROR = false;
      }

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} tests.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: tests.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });

        Promise.all([
          lookup(`${PROJECT_ROOT}/tests`, ['js']),
          lookup(`${PROJECT_ROOT}/src`, ['-test.js'], { filter: onlyTestFiles })
        ]).then(([testFolderFiles, appFolderTestFiles]) => {
          lintJavaScript(testFolderFiles.concat(appFolderTestFiles), buildConfig);
        });
      });
    }).catch((error) => buildError(error, reject));
  });
}

function buildError(error, rejectPromise) {
  global.HAS_TESTS_JS_BUILD_ERROR = true;
  say.stop();
  say.speak('tests.js build fails. Check your code!');

  Console.error('tests.js build error:');
  console.log(error);
  rejectPromise(error);
}

function transpileFile(fileName, appName, projectRoot, rejectPromise) {
  return new Promise((resolve) => {
    return fs.readFile(fileName).then((fileContents) => {
      return resolve(convertESModuletoAMD(fileContents, {
        moduleName: getModuleName(fileName, appName, projectRoot)
      }));
    }).catch((error) => buildError(error, rejectPromise));
  });
}

function getModuleName(fileName, appName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  return `${appName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}
