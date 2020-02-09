import util from 'util';
import fs from 'fs-extra';
import chalk from 'ansi-colors';
import sass from 'sass';
import Console from '../utils/console.js';
import countTime from '../utils/count-time.js';
import findProjectRoot from '../utils/find-project-root.js';
import lookup from '../utils/recursive-file-lookup.js';
import say from '../utils/say.js';
import { formatTimePassed, formatSize } from '../utils/asset-reporter.js';

const compileScssAsync = util.promisify(sass.render);

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
    Console.log(chalk.yellow('BUILDING:'), 'application.css...');

    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || {};
    const environment = ENV.environment || 'development';
    const timer = countTime();
    const dontIncludeStyleFiles = (item) => !item.path.includes(`${projectRoot}/src/ui/styles`);

    lookup(`${projectRoot}/src/ui`, ['scss'], { filter: dontIncludeStyleFiles }).then((fileNames) => {
      return Promise
        .all([`${projectRoot}/src/ui/styles/application.scss`].concat(fileNames).map((scssFile) => fs.readFile(scssFile)))
    }).then((scssContent) => {
      return compileScssAsync({
        data: scssContent.join('\n'),
        outputStyle: ['production', 'demo'].includes(environment) ? 'compressed' : 'expanded',
        sourceMap: true,
        includePaths: [`${projectRoot}/src/ui/styles`]
      });
    }).then((result) => {
      const compiledCSS = result.css.toString();
        return fs.writeFile(`${projectRoot}/tmp/assets/application.css`, compiledCSS).then(() => {
          const timePassed = timer.stop();

          if (global.HAS_SCSS_BUILD_ERROR) {
            say.stop();
            say.speak('SCSS is now fixed. Well done');
            global.HAS_SCSS_BUILD_ERROR = false;
          }

          Console.log(`${chalk.green('BUILT:')} application.css in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}] Environment: ${environment}`);

          resolve({
            message: `BUILT: application.css in ${timePassed}ms [${formatSize(compiledCSS.length)}] Environment: ${environment}`,
            size: compiledCSS.length
          });
        });
      }).catch((error) => {
        global.HAS_SCSS_BUILD_ERROR = true;

        say.stop();
        say.speak('SCSS build fails. Check your code!');

        Console.error('CSS build error:');
        console.log(error);
        reject(error);
      });
  });
}
