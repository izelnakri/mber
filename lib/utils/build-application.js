import fs from 'fs';
import chalk from 'chalk';
import Console from './console';
import { promisify } from 'util';
import importAddonToAMD from './import-addon-to-amd';
import searchInParentDirectories from './search-in-parent-directories';
import countTime from './count-time';

const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat)

// const APPLICATION_NAME = 'getherefromenv' || 'frontend';
// const readFileAsync = promisify(fs.readFile);
// const readFolderAsync = (folderName) => {
//   importAddonToAMD()
// };

export default function(environment='development') {
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.js...');
    const timer = countTime();

    const PACKAGE_JSON_PATH = searchInParentDirectories(process.cwd(), 'package.json');
    const PROJECT_PATH = PACKAGE_JSON_PATH.replace('/package.json', '');
    const ENV = require(`${PROJECT_PATH}/config/environment.js`)(environment);
    const APPLICATION_NAME = ENV.modulePrefix;

    return Promise.all([
      importAddonToAMD(`${APPLICATION_NAME}/router`, 'src/router.js'),
      importAddonToAMD(`${APPLICATION_NAME}/resolver`, 'src/resolver.js'),
      importAddonToAMD(`${APPLICATION_NAME}/main`, 'src/main.js') // NOTE: maybe make main.js bundled
    ]).then((fileContents) => {
      return writeFileAsync(`${PROJECT_PATH}/tmp/application.js`, fileContents.join('\n') + `
        [${APPLICATION_NAME}].forEach((string) => window.APP = require(string).default); // NOTE: avoiding parcel require lookup
      `);
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(`${PROJECT_PATH}/tmp/application.js`).then((stats) => {
        resolve(Console.log(`${chalk.green('BUILT:')} application.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: development`));
      })
    });
  });

  // return new Promise((resolve) => {
  //   return Promise.all([
  //     // readFolderAsync(),
  //     importAddonToAMD(`${APPLICATION_NAME}/router`, 'src/router.js'),
  //     importAddonToAMD(`${APPLICATION_NAME}/resolver`, 'src/resolver.js'),
  //     importAddonToAMD(`${APPLICATION_NAME}/main`, 'src/main.js') // NOTE: maybe make main.js bundled
  //   ]).then((fileContents) => {
  //     fs.writeFileSync('./ember-app-boilerplate/tmp/application.js', fileContents.join('\n') + `
  //       [${APPLICATION_NAME}].forEach((string) => window.APP = require(string).default); // NOTE: avoiding parcel require lookup
  //     `);
  //     resolve(console.log('application.js build finished')); // TODO: put time, size and env
  //   });
  //   // readFileAsync('./vendor/loader.js'),
  //   // readFileAsync('./vendor/jquery.js'),
  //   // readFileAsync('./vendor/ember.debug.js'),
  //
  //   // define places to read js
  //   // trans
  // });
}

function transpileHandlebars(code) {

}

function formatTimePassed(timePassed) {
  return chalk.yellow(`${timePassed}ms`);
}

function formatSize(sizeInBytes) {
  const sizeInMb = (sizeInBytes % 1000000) > 0

  if (sizeInMb) {
    return `${(sizeInBytes / 1000000).toFixed(2)} MB`;
  }

  return `${(sizeInBytes / 1000).toFixed(2)} KB`;
}
