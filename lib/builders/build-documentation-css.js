import util from 'util';
import fs from 'fs-extra';
import chalk from 'ansi-colors';
import sass from 'node-sass';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import say from '../utils/say';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

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
    Console.log(chalk.yellow('BUILDING:'), 'documentation.css...');

    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || {};
    const environment = ENV.environment || 'development';

    const timer = countTime();
    const [vendorScssFiles, scssFiles] = await Promise.all([
      lookup(`${projectRoot}/documentation/ui`, 'scss', {
        filter(item) {
          return !item.path.includes(`${projectRoot}/documentation/ui/styles`);
        }
      }) || [],
      lookup(`${__dirname}/../addons/mber-documentation/src/ui`, ['scss']) || []
    ]);
    const fileNames = vendorScssFiles.concat(scssFiles);

    Promise.all([`${projectRoot}/documentation/ui/styles/application.scss`].concat(fileNames).map((scssFile) => fs.readFile(scssFile)))
      .then((scssContent) => {
        return compileScssAsync({
          data: scssContent.join('\n'),
          outputStyle: ['production', 'demo'].includes(environment) ? 'compressed' : 'expanded',
          sourceMap: true,
          includePaths: [`${projectRoot}/documentation/ui/styles`]
        });
      }).then((result) => {
        const compiledCSS = result.css.toString();

        return fs.writeFile(`${projectRoot}/tmp/assets/documentation.css`, compiledCSS).then(() => {
          const timePassed = timer.stop();

          if (global.HAS_DOCUMENTATION_SCSS_BUILD_ERROR) {
            say.stop();
            say.speak('documentation.css is now fixed. Well done');
            global.HAS_DOCUMENTATION_SCSS_BUILD_ERROR = false;
          }

          Console.log(`${chalk.green('BUILT:')} documentation.css in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}] Environment: ${environment}`);

          resolve({
            message: `BUILT: documentation.css in ${timePassed}ms [${formatSize(compiledCSS.length)}] Environment: ${environment}`,
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
