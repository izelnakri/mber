import fs from 'fs-extra';
import chalk from 'ansi-colors';
import Terser from 'terser';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd.js';
import Console from '../utils/console.js';
import countTime from '../utils/count-time.js';
import findProjectRoot from '../utils/find-project-root.js';
import lookup from '../utils/recursive-file-lookup.js';
import say from '../utils/say.js';
import { formatTimePassed, formatSize } from '../utils/asset-reporter.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
}, lint=true) {
  return new Promise(async (resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'memserver.js...');

    const ENV = buildConfig.ENV || {};
    const applicationName = ENV.modulePrefix || 'frontend';
    const environment = ENV.environment || 'development';
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const outputPath = `${projectRoot}/tmp/assets/memserver.js`;
    const timer = countTime();

    Promise.all([
      fs.readFile(`${VENDOR_PATH}/memserver.js`),
      fs.readFile(`${__dirname}/../addons/memserver/instance-initializers/memserver.js`),
      lookup(`${projectRoot}/memserver`, ['js', 'ts'])
    ]).then(([baseMemServerCode, memServerInitializerCode, userMemServerFiles]) => {
      return Promise.all([
        baseMemServerCode,
        convertESModuletoAMD(memServerInitializerCode, {
          moduleName: `${applicationName}/instance-initializers/memserver`
        }),
        new Promise((resolve, reject) => {
          return global.MBER_THREAD_POOL.submit({
            action: 'TRANSPILE_JS', fileNames: userMemServerFiles, applicationName, projectRoot
          }).then((result) => resolve(result.join('\n')))
            .catch((error) => reject(error))
        })
      ]);
    }).then((contents) => {
      return writeMemServerFile(outputPath, contents.join('\n'), {
        minify: ENV.memserver && ENV.memserver.minify
       });
    }).then(() => {
      const timePassed = timer.stop();

      if (global.HAS_MEMSERVER_BUILD_ERROR) {
        say.stop();
        say.speak('MemServer.js is now fixed. Well done');
        global.HAS_MEMSERVER_BUILD_ERROR = false;
      }

      fs.stat(outputPath).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} memserver.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        if (!lint) {
          return resolve({
            message: `BUILT: memserver.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
            stats: stats
          });
        }

        lookup(`${projectRoot}/memserver`, ['js']).then((fileNames) => {
          return global.MBER_THREAD_POOL.submit({ action: 'LINT_JS', fileNames, projectRoot });
        }).then(() => {
          resolve({
            message: `BUILT: memserver.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
            stats: stats
          });
        }).catch((error) => reject(error));
      });
    }).catch((error) => buildError(error, reject));
  });
}

function buildError(error, rejectPromise) {
  global.HAS_MEMSERVER_BUILD_ERROR = true;
  say.stop();
  say.speak('MemServer.js build fails. Check your code!');

  Console.error('memserver.js build error!');
  rejectPromise(error);
}

function writeMemServerFile(outputPath, content, options={ minify: false }) {
  if (options.minify) {
    return fs.writeFile(outputPath, Terser.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
  }

  return fs.writeFile(outputPath, content);
}
