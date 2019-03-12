import fs from 'fs-extra';
import chalk from 'ansi-colors';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

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
    const ENVIRONMENT = ENV.environment || 'development';
    const timer = countTime();
    const dontIncludeStyleFiles = (item) => !item.path.includes(`${projectRoot}/src/ui/styles`);

    lookup(`${projectRoot}/src/ui`, ['scss'], { filter: dontIncludeStyleFiles }).then((fileNames) => {
      return global.MBER_THREAD_POOL.submit({
        action: 'TRANSPILE_SCSS',
        fileNames: [`${projectRoot}/src/ui/styles/application.scss`].concat(fileNames),
        projectRoot
      });
    }).then((compiledCSS) => {
        return fs.writeFile(`${projectRoot}/tmp/assets/application.css`, compiledCSS).then(() => {
          const timePassed = timer.stop();

          if (global.HAS_SCSS_BUILD_ERROR) {
            say.stop();
            say.speak('SCSS is now fixed. Well done');
            global.HAS_SCSS_BUILD_ERROR = false;
          }

          Console.log(`${chalk.green('BUILT:')} application.css in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}] Environment: ${ENVIRONMENT}`);

          resolve({
            message: `BUILT: application.css in ${timePassed}ms [${formatSize(compiledCSS.length)}] Environment: ${ENVIRONMENT}`,
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
