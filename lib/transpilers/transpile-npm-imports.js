import chalk from 'chalk';
import browserify from 'browserify';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

export default function(moduleName, entrypoint) {
  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING AMD MODULE:'), `${moduleName}...`);

    const code = await bundleBrowserify(entrypoint, moduleName);

    resolve(`
      ;(function() {
        function vendorModule() {
          'use strict';

          ${code}

          return {
            'default': _${moduleName},
            __esModule: true,
          };
        }

        define('${moduleName}', [], vendorModule);
      })();
    `);
  })
}

function bundleBrowserify(entrypoint, moduleName) {
  const timer = countTime();

  return new Promise((resolve) => {
    let result = '';
    browserify(entrypoint, { standalone: `_${moduleName}` }).transform('babelify', {
      presets: ['babel-preset-env']
    }).bundle().on('data', (chunk) => {
      result += chunk;
    }).on('end', () => {
      const timePassed = timer.stop();

      Console.log(`${chalk.green('BUILT AMD MODULE:')} ${moduleName} in ${formatTimePassed(timePassed)} [${formatSize(result.length)}]`);

      resolve(result);
    });
  });
}
