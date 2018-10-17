// TODO: investigate converting this to rollup, reference: scripts/global-jquery.js
import fs from 'fs-extra';
import chalk from 'chalk';
import browserify from 'browserify';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

export default function(moduleName, entrypoint, options={ transpile: true }) {
  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING AMD MODULE:'), `${moduleName}...`);

    const OPTIONS = Object.assign({}, { transpile: true }, options);
    const globalModuleName = moduleName.replace('/', '__').replace('.', '_');
    const code = await bundleBrowserify(entrypoint, {
      moduleName: moduleName,
      globalModuleName: globalModuleName,
      transpile: OPTIONS.transpile
    });
    const returnCode = OPTIONS.transpile ? `
      return window['_${globalModuleName}'];
    ` : `
      return window['${moduleName}'];
    `;

    resolve(`
      ;(function() {
        function vendorModule() {
          'use strict';

          ${code}

          ${returnCode}
        }

        define('${moduleName}', [], vendorModule);
      })();
    `);
  })
}

function bundleBrowserify(entrypoint, { moduleName, globalModuleName, transpile }) {
  const timer = countTime();

  return new Promise((resolve) => {
    if (transpile) {
      let result = '';

      return browserify(entrypoint, { standalone: `_${globalModuleName}` }).transform('babelify', { // TODO: handle / in moduleNames
        presets: ['@babel/preset-env']
      }).bundle().on('data', (chunk) => {
        result += chunk;
      }).on('end', () => {
        const timePassed = timer.stop();

        Console.log(`${chalk.green('BUILT AMD MODULE:')} ${moduleName} in ${formatTimePassed(timePassed)} [${formatSize(result.length)}]`);

        resolve(result);
      });
    }

    fs.readFile(entrypoint).then((buffer) => {
      const timePassed = timer.stop();
      const code = buffer.toString();

      Console.log(`${chalk.green('BUILT AMD MODULE:')} ${moduleName} in ${formatTimePassed(timePassed)} [${formatSize(code.length)}]`);

      resolve(code);
    });
  });
}
