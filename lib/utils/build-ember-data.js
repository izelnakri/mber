import fs from 'fs';
import { promisify } from 'util';
import convertESModuletoAMD from './convert-es-module-to-amd';
import lookup from './recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default function() {
  return new Promise((resolve, reject) => {
    lookup('./node_modules/ember-data/addon', { depthLimit: 0 }).then((files) => {
      return Promise.all(files.map((file) => readFileAsync(file)))
    }).then((fileContents) => {
      const transformedFiles = fileContents.map((fileContent) => convertESModuletoAMD(fileContent));

      return resolve(transformedFiles.join('\n'));
    });
  });
}

// TODO: also mock/shim ember-data
