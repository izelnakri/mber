import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import sass from 'node-sass';
import Console from './console';
import findProjectRoot from './find-project-root';
import lookup from './recursive-file-lookup';
import countTime from './count-time';
import { formatTimePassed, formatSize } from './asset-reporter';

const compileScssAsync = promisify(sass.render);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile)

export default function(environment='development') {
  const PROJECT_ROOT = findProjectRoot();
  const STYLES_ROOT = `${PROJECT_ROOT}/src/ui/styles/application.scss`;

  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.css...');

    const timer = countTime();
    const scssFiles = await lookup(`${PROJECT_ROOT}/src/ui`, 'scss', {
      filter(item) {
        return !item.includes(`${PROJECT_ROOT}/src/ui/styles`);
      }
    }) || [];

    console.log('scssFiles are', scssFiles);

    return Promise.all([STYLES_ROOT].concat(scssFiles).map((scssFile) => readFileAsync(scssFile)))
      .then((scssContent) => {
        return compileScssAsync({
          data: scssContent.join('\n'),
          outputStyle: ['production', 'demo'].includes(environment) ? 'compressed' : 'expanded',
          sourceMap: true,
        });
      }).then((result) => {
        const compiledCSS = result.css.toString();

        writeFileAsync(`${PROJECT_ROOT}/tmp/application.css`, compiledCSS).then(() => {
          const timePassed = timer.stop();

          Console.log(`${chalk.green('BUILT:')} application.css in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}] Environment: ${environment}`);

          resolve({
            message: `BUILT: application.css in ${timePassed}ms [${formatSize(compiledCSS.length)}] Environment: ${environment}`,
            size: compiledCSS.length
          });
        });
      }).catch((error) => console.log(error));
  });
}
