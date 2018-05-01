import fs from 'fs';
import { promisify } from 'util';
import RSVP from 'rsvp';
import convertESModuletoAMD from './convert-es-module-to-amd';
import lookup from './recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default function() {
  return new Promise((resolve) => {
    lookup('./node_modules/ember-data/addon', { depthLimit: -1 }).then((files) => {
      return RSVP.hash(files.reduce((result, fileName) => {
        return Object.assign(result, { [fileName]: readFileAsync(fileName) });
      }, {}));
    }).then((contents) => {
      const transformedFiles = Object.keys(contents)
        .map((fileName) => {
          const startIndex = fileName.indexOf('ember-data/addon');
          const moduleName = fileName.slice(startIndex + 16);
          const targetModuleName = moduleName.endsWith('index.js') ?
            moduleName.slice(0, -9) : `${moduleName.slice(0, -3)}`;
          const finalModuleName = `ember-data${targetModuleName}`;

          if (fileName === '/Users/izelnakri/mber/node_modules/ember-data/addon/-private/index.js') {
            console.log('FINALMODULENAMEIS', finalModuleName);
          }
          // console.log('moduleName is', moduleName, 'finalModuleName is', finalModuleName);

          // TODO: ../ references are incorrect
          return convertESModuletoAMD(contents[fileName], finalModuleName, );
        });

      // TODO: it will probably not work because require paths are wrong.

      return resolve(transformedFiles.join('\n'));
    });
  });
}

// TODO: also mock/shim ember-data
