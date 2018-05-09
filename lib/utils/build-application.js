import fs from 'fs';
import { promisify } from 'util';
// import importAddonToAMD from './import-addon-to-amd';
import searchInParentDirectories from './search-in-parent-directories';

// const APPLICATION_NAME = 'getherefromenv' || 'frontend';
// const readFileAsync = promisify(fs.readFile);
// const readFolderAsync = (folderName) => {
//   importAddonToAMD()
// };

export default function() {
  return new Promise((resolve) => {
    const PACKAGE_JSON_PATH = searchInParentDirectories(process.cwd(), 'package.json');
    const PROJECT_PATH = PACKAGE_JSON_PATH.replace('/package.json', '');

    // TODO: show time it took and assets size

    return resolve(fs.writeFileSync(`${PROJECT_PATH}/tmp/application.js`, 'window.runnnn = true'));
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
