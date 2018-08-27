import fs from 'fs-extra';
import { promisify } from 'util';
import chalk from 'chalk';
import sass from 'node-sass';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const compileScssAsync = promisify(sass.render);

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
    Console.log(chalk.yellow('BUILDING:'), 'documentation.css...');

    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || {};
    const ENVIRONMENT = ENV.environment || 'development';
    const STYLES_ROOT = `${PROJECT_ROOT}/documentation/ui/styles/application.scss`;
    const timer = countTime();
    const scssFiles = await lookup(`${PROJECT_ROOT}/documentation/ui`, 'scss', {
      filter(item) {
        return !item.path.includes(`${PROJECT_ROOT}/documentation/ui/styles`);
      }
    }) || [];

    return Promise.all([STYLES_ROOT].concat(scssFiles).map((scssFile) => fs.readFile(scssFile)))
      .then((scssContent) => {
        return compileScssAsync({
          data: scssContent.join('\n'),
          outputStyle: ['production', 'demo'].includes(ENVIRONMENT) ? 'compressed' : 'expanded',
          sourceMap: true,
          includePaths: [`${PROJECT_ROOT}/documentation/ui/styles`]
        });
      }).then((result) => {
        const compiledCSS = result.css.toString();

        return fs.writeFile(`${PROJECT_ROOT}/tmp/assets/documentation.css`, compiledCSS).then(() => {
          const timePassed = timer.stop();

          if (global.HAS_DOCUMENTATION_SCSS_BUILD_ERROR) {
            say.stop();
            say.speak('documentation.css is now fixed. Well done');
            global.HAS_DOCUMENTATION_SCSS_BUILD_ERROR = false;
          }

          Console.log(`${chalk.green('BUILT:')} documentation.css in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}] Environment: ${ENVIRONMENT}`);

          resolve({
            message: `BUILT: documentation.css in ${timePassed}ms [${formatSize(compiledCSS.length)}] Environment: ${ENVIRONMENT}`,
            size: compiledCSS.length
          });
        });
      }).catch((error) => {
        global.HAS_DOCUMENTATION_SCSS_BUILD_ERROR = true;

        say.stop();
        say.speak('Document SCSS build fails. Check your code!');

        Console.error('Document CSS build error:');
        console.log(error);
        reject(error);
      });
  });
}
