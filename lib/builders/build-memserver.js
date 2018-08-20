import fs from 'fs-extra';
import chalk from 'chalk';
import UglifyJS from 'uglify-es';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lintJavaScript from '../utils/lint-javascript';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: {},
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null
}) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'memserver.js...');

    const ENV = buildConfig.ENV || {};
    const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
    const environment = ENV.environment || 'development';
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/memserver.js`;
    const timer = countTime();

    Promise.all([
      fs.readFile(`${VENDOR_PATH}/memserver.js`),
      fs.readFile(`${__dirname}/../addons/memserver/instance-initializers/memserver.js`),
      lookup(`${PROJECT_ROOT}/memserver`, ['js'])
    ]).then(([baseMemServerCode, memServerInitializerCode, userMemServerFiles]) => {
      const operations = [
        baseMemServerCode,
        convertESModuletoAMD(memServerInitializerCode, {
          moduleName: `${APPLICATION_NAME}/instance-initializers/memserver`
        })
      ].concat(userMemServerFiles.map((file) => transpileFile(file, APPLICATION_NAME, reject)));

      return Promise.all(operations);
    }).then((contents) => {
      return writeMemServerFile(OUTPUT_PATH, contents.join('\n'), {
        minify: ENV.memserver && ENV.memserver.minify
       });
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_MEMSERVER_BUILD_ERROR) {
        say.stop();
        say.speak('MemServer.js is now fixed. Well done');
        global.HAS_MEMSERVER_BUILD_ERROR = false;
      }

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} memserver.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: memserver.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });

        lookup(`${PROJECT_ROOT}/memserver`, ['js'])
          .then((files) => lintJavaScript(files, buildConfig));
      });
    }).catch((error) => buildError(error, reject));
  });
}

function buildError(error, rejectPromise) {
  global.HAS_MEMSERVER_BUILD_ERROR = true;
  say.stop();
  say.speak('MemServer.js build fails. Check your code!');

  Console.error('memserver.js build error:');
  console.log(error);
  rejectPromise(error);
}

function transpileFile(fileName, appName, rejectPromise) {
  return new Promise((resolve) => {
    return fs.readFile(fileName).then((fileContents) => {
      return resolve(convertESModuletoAMD(fileContents, {
        moduleName: getModuleName(fileName, appName)
      }));
    }).catch((error) => buildError(error, rejectPromise));
  });
}

function getModuleName(fileName, appName) {
  const moduleName = fileName.split('memserver/')[1];

  return `${appName}/memserver/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

function writeMemServerFile(OUTPUT_PATH, content, options={ minify: false }) {
  if (options.minify) {
    return fs.writeFile(OUTPUT_PATH, UglifyJS.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
  }

  return fs.writeFile(OUTPUT_PATH, content);
}
